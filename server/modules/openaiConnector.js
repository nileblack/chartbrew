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
      max_completion_tokens: parseInt(settings.openai.maxTokens, 10) || 2000,
    };

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
      const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
      
      // 构建提示
      const prompt = `Based on the following relevant schema information:

${context}

Generate a SQL query for this request: ${description}


Please ensure the query:
1. Uses only the tables and fields mentioned in the schema
2. Includes proper JOIN conditions if multiple tables are needed
3. Uses appropriate WHERE clauses for filtering
4. Returns a list of SQL queries in the following JSON format:
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
IMPORTANT: Your response must be a valid JSON array containing 2-3 SQL query objects.
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
}

module.exports = new OpenAIConnector(); 