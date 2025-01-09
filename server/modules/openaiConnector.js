const OpenAI = require("openai");
const settings = process.env.NODE_ENV === "production" ? require("../settings") : require("../settings-dev");
const vectorStore = require('./vectorStore');

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
            // const relevantDocs = await vectorStore.searchRelevant(description);
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
            const tableSummaryString = tableSummary.join('\n\n');
            const language = "chinese";
            // 构建提示
            const prompt = `Based on the following relevant schema information:

${tableSummaryString}

Generate a SQL query for this request: ${description}

work flow :
step one: generate 2-3 sql queries

Please ensure the query:
a. Do not use any thing out of the schema
b. Uses only the tables and fields mentioned in the schema
c. Includes proper JOIN conditions if multiple tables are needed
d. Uses appropriate WHERE clauses for filtering
e. Verifies that all fields used in SELECT, WHERE, JOIN, GROUP BY, ORDER BY clauses exist in their respective tables

step two: verify the sql
a. verify the sql is correct
b. verify the table are in the schema
c. verify the fields are in the schema
d. verify the functions are supported by the database, database type is ${connection.type}

step three: generate description
a. generate the description in ${language}

step four: return the result
a. Returns a list of SQL queries in the following JSON format:
[
  {
    "description": "A clear explanation of what this query does",
    "sql": "The SQL query statement", 
    "tables": ["list", "of", "tables", "used"],
    "confidence": 0.95  // A number between 0 and 1 indicating how well this query matches the request
  },
  ...
]

Please return a JSON array with 2-3 valid SQL queries that best match the request, ordered from most relevant to least relevant.

IMPORTANT: 
- Verify that every field and table used in the queries exists in the schema tables
- Include the fields object to document which fields are used from each table
- DO NOT return any other text or comments, just the JSON array
`;

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
            const commentGenerationPrompt = `For the table "${tableName}", please analyze all fields and generate appropriate field descriptions.
Please consider the relationships and context between all fields when generating descriptions.
Return a JSON object where keys are field names and values are their descriptions in Chinese.

Complete table structure:
${fields.map(f =>
                `${f.name} (${f.type})${f.isPrimary ? ' PRIMARY KEY' : ''}${f.required ? ' NOT NULL' : ''}${f.defaultValue ? ` DEFAULT ${f.defaultValue}` : ''}${f.comment ? ` - Current comment: ${f.comment}` : ''}`
            ).join('\n')}

Example response format:
{
    "field_name": "这是字段描述",
    "another_field": "另一个字段的描述"
}

IMPORTANT:
- Provide descriptions for ALL fields
- Consider the relationships between fields
- If a field already has a comment, you can improve it if necessary
- Descriptions should be clear and professional in Chinese`;

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

            const prompt = `Based on the following database table structure:

Table: ${tableName}
Fields:
${fieldDescriptions}

Please provide a comprehensive description of this table that includes:
1. The main purpose of the table
2. Key fields and their significance
3. Relationships with other tables (based on primary/foreign keys)
4. Any business rules or constraints evident from the structure
5. Common use cases for this table

Format the response in clear, professional language suitable for technical documentation.

IMPORTANT:
- Please provide the response in Chinese (Simplified).
- Please format the response in markdown.`;

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