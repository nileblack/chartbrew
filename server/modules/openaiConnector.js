const OpenAI = require("openai");
const settings = process.env.NODE_ENV === "production" ? require("../settings") : require("../settings-dev");
const vectorStore = require('./vectorStore');
const { SQL_GENERATION_PROMPT, TABLE_COMMENT_PROMPT, TABLE_DESCRIPTION_PROMPT } = require('./prompts');

class OpenAIConnector {
    constructor() {
        if (!settings.openai.apiKey) {
            throw new Error("OpenAI API key is not configured");
        }

        this.openai = new OpenAI({
            apiKey: settings.openai.apiKey,
            baseURL: settings.openai.endpoint,
            maxRetries: 3,
            timeout: 30000,
            dangerouslyAllowBrowser: true,
        });

        this.defaultConfig = {
            model: settings.openai.model,
            max_completion_tokens: parseInt(settings.openai.maxTokens, 10) || 4000,
        };
        console.log(this.defaultConfig);
        this.initialized = false;
    }

    async ensureInitialized(schema) {
        if (!this.initialized) {
            await vectorStore.initialize(schema);
            this.initialized = true;
        }
    }

    async generateSqlQuery(description, connection) {
        try {
            // await this.ensureInitialized(connection.schema);

            // // 使用 vectorStore 的 searchRelevant 方法
            const relevantDocs = await vectorStore.similaritySearch(connection.team_id, connection.id, description, 5);
            const tableSummary = [];
            const schema = connection.schema;
            const getTableFields = (schema, tableName) => {
                const tableInfo = schema.description[tableName];
                return Object.entries(tableInfo).map(([fieldName, info]) => ({
                    name: fieldName,
                    type: info.type,
                    isPrimary: info.primaryKey,
                    comment: info.comment
                }));
            };


            // // Step 1: 首先用一个轻量级的请求来确定需要用到哪些表
            // const tableIdentificationResponse = await this.openai.chat.completions.create({
            //     ...this.defaultConfig,
            //     messages: [
            //         {
            //             role: "user",
            //             content: `Given these available tables: ${Object.keys(schema.tables).join(', ')}\n\n` +
            //                 `For this request: "${description}"\n\n` +
            //                 `Return only a JSON array of table names that would be needed to fulfill this request. don't return table name out of what i give you. Example: ["users", "orders"]`
            //         }
            //     ],
            // });

            // // 解析需要用到的表
            // let relevantTables;
            // try {
            //     const content = tableIdentificationResponse.choices[0].message.content.trim()
            //         .replace(/```json\n?/, '').replace(/```/, '');
            //     relevantTables = JSON.parse(content);
            // } catch (error) {
            //     console.error("[Parse Error]", error);
            //     relevantTables = Object.keys(schema.tables); // 如果解析失败，使用所有表作为后备方案
            // }

            // console.log(relevantTables);
            let relevantTables = schema.tables;
            for (const tableName of relevantTables) {
                const fields = getTableFields(schema, tableName);
                tableSummary.push(`TABLE ${tableName} 
COLUMNS: ${fields.map(f => `name: ${f.name}, type: ${f.type}, primaryKey: ${f.isPrimary ? 'true' : 'false'}, comment: ${f.comment ? ` - ${f.comment}` : ''}`).join('\n')}`);
            }
            console.log(relevantDocs);
            const tableSummaryString = relevantDocs.length > 0 ? relevantDocs.map(doc => doc.pageContent).join('\n\n') : tableSummary.join('\n\n');
            const language = "chinese";
            // 构建提示
            const prompt = SQL_GENERATION_PROMPT(tableSummaryString, description, connection.type, language);

            console.log("[OpenAI Request]", {
                // relevantDocs: relevantDocs.length,
                ...this.defaultConfig,
                prompt
            });

            const response = await this.openai.chat.completions.create({
                ...this.defaultConfig,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
            });

            console.log("[OpenAI Response]", {
                model: response.model,
                usage: response.usage,
                choices: JSON.stringify(response.choices)
            });

            let content = response.choices[0].message.content.trim();

            // 移除 Markdown 代码块标记
            content = content.replace(/^```json\n/, '')  // 移除开头的 ```json
                .replace(/^```\n/, '')       // 或者移除开头的 ```
                .replace(/\n```$/, '')       // 移除结尾的 ```
                .trim();

            let queries;
            try {
                queries = JSON.parse(content);
            } catch (error) {
                console.error("[Parse Error] Content:", content);
                console.error("[Parse Error] Error:", error);

                return {
                    success: false,
                    error: "Failed to parse SQL queries response",
                    data: null
                };
            }

            if (!Array.isArray(queries)) {
                throw new Error("OpenAI response is not an array of queries");
            }

            queries.forEach((query, index) => {
                if (!query.description || !query.sql || !Array.isArray(query.tables) || typeof query.confidence !== 'number') {
                    throw new Error(`Query at index ${index} is missing required fields`);
                }
            });

            return {
                success: true,
                data: {
                    queries: queries,
                    context: {
                        relevantTables: [...new Set(queries.flatMap(q => q.tables))],
                        totalQueries: queries.length
                    }
                }
            };

        } catch (error) {
            console.error("[OpenAI Error]", error);
            return {
                success: false,
                error: error.message || "An unexpected error occurred",
                data: null
            };
        }
    }

    async generateTableDescription(tableName, fields) {
        try {
            // First, generate comments for all fields with complete context
            const language = "chinese";
            const tableSummary = fields.map(f => `${f.name} (${f.type})${f.isPrimary ? ' PRIMARY KEY' : ''}${f.required ? ' NOT NULL' : ''}${f.defaultValue ? ` DEFAULT ${f.defaultValue}` : ''} - ${f.comment || ''}`).join('\n');
            const commentGenerationPrompt = TABLE_COMMENT_PROMPT(tableName, tableSummary, language);

            const commentResponse = await this.openai.chat.completions.create({
                ...this.defaultConfig,
                messages: [
                    {
                        role: "user",
                        content: commentGenerationPrompt
                    }
                ],
            });

            let fieldsWithComments;
            try {
                const content = commentResponse.choices[0].message.content.trim()
                    .replace(/```json\n?/, '').replace(/```/, '');
                const generatedComments = JSON.parse(content);

                // Update all fields with generated comments
                fieldsWithComments = fields.map(field => ({
                    ...field,
                    comment: generatedComments[field.name] || field.comment || ''
                }));
            } catch (error) {
                console.error("[Comment Generation Parse Error]", error);
                fieldsWithComments = fields; // Fallback to original fields if parsing fails
            }
            console.log("fieldsWithComments", fieldsWithComments);
            // Continue with the original table description logic using fieldsWithComments
            const fieldDescriptions = fieldsWithComments.map(f =>
                `${f.name} (${f.type})${f.isPrimary ? ' PRIMARY KEY' : ''}${f.required ? ' NOT NULL' : ''}${f.defaultValue ? ` DEFAULT ${f.defaultValue}` : ''} - ${f.comment || ''}`
            ).join('\n');

            const prompt = TABLE_DESCRIPTION_PROMPT(tableName, fieldDescriptions);

            const response = await this.openai.chat.completions.create({
                ...this.defaultConfig,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
            });

            return {
                success: true,
                description: response.choices[0].message.content.trim(),
                fields: fieldsWithComments
            };

        } catch (error) {
            console.error("[OpenAI Error]", error);
            return {
                success: false,
                error: error.message || "An unexpected error occurred",
                description: null,
                fields: null
            };
        }
    }
}

module.exports = new OpenAIConnector(); 