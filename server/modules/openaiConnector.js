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
      defaultHeaders: { 'OpenAI-Debug': 'true' },
      defaultQuery: { 'api-debug': 'true' },
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

  async generateSqlQuery(description, schema) {
    try {
      await this.ensureInitialized(schema);
      
      // 使用 vectorStore 的 searchRelevant 方法
      const relevantDocs = await vectorStore.searchRelevant(description);
        const tableSummary = [];
        const getTableFields = (schema, tableName) => {
            const tableInfo = schema.description[tableName];
            return Object.entries(tableInfo).map(([fieldName, info]) => ({
                name: fieldName,
                type: info.type,
                required: !info.allowNull,
                isPrimary: info.primaryKey,
                isAutoIncrement: info.autoIncrement,
            }));
        };


        // Step 1: 首先用一个轻量级的请求来确定需要用到哪些表
        const tableIdentificationResponse = await this.openai.chat.completions.create({
            ...this.defaultConfig,
            messages: [
                {
                    role: "user",
                    content: `Given these available tables: ${Object.keys(schema.tables).join(', ')}\n\n` +
                        `For this request: "${description}"\n\n` +
                        `Return only a JSON array of table names that would be needed to fulfill this request. don't return table name out of what i give you. Example: ["users", "orders"]`
                }
            ],
        });

        // 解析需要用到的表
        let relevantTables;
        try {
            const content = tableIdentificationResponse.choices[0].message.content.trim()
                .replace(/```json\n?/, '').replace(/```/, '');
            relevantTables = JSON.parse(content);
        } catch (error) {
            console.error("[Parse Error]", error);
            relevantTables = Object.keys(schema.tables); // 如果解析失败，使用所有表作为后备方案
        }

        console.log(relevantTables);

        for (const [idx, tableName] of relevantTables) {
            const fields = getTableFields(schema, tableName);
            tableSummary.push(`TABLE ${tableName} 
COLUMNS: ${fields.map(f => `${f.name} ${f.type} ${f.isPrimary ? ' PRIMARY KEY' : ''}`).join('\n')}`);
        }
        const tableSummaryString = tableSummary.join('\n\n');

      // 构建提示
      const prompt = `Based on the following relevant schema information:

${tableSummaryString}

Generate a SQL query for this request: ${description}


Please ensure the query:
1. Uses only the tables and fields mentioned in the schema
2. Includes proper JOIN conditions if multiple tables are needed
3. Uses appropriate WHERE clauses for filtering
4. Verifies that all fields used in SELECT, WHERE, JOIN, GROUP BY, ORDER BY clauses exist in their respective tables
5. Returns a list of SQL queries in the following JSON format:
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
- Your response must be a valid JSON array containing 2-3 SQL query objects
- Verify that every field referenced in the queries exists in the schema tables
- Include the fields object to document which fields are used from each table
`;

      console.log("[OpenAI Request]", {
        relevantDocs: relevantDocs.length,
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
        choices: response.choices
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
      // 构建表结构描述
      const fieldDescriptions = fields.map(f => 
        `${f.name} (${f.type})${f.isPrimary ? ' PRIMARY KEY' : ''}${f.required ? ' NOT NULL' : ''}${f.defaultValue ? ` DEFAULT ${f.defaultValue}` : ''}${f.comment ? ` - ${f.comment}` : ''}`
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
        description: response.choices[0].message.content.trim()
      };

    } catch (error) {
      console.error("[OpenAI Error]", error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred",
        description: null
      };
    }
  }
}

module.exports = new OpenAIConnector(); 