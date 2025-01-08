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
      // 确保向量存储已初始化
      await this.ensureInitialized(schema);

      // 检索相关的 schema 信息
      const relevantDocs = await vectorStore.searchRelevant(description);
      
      // 构建上下文
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
    "sql": "The SQL query statement"
  },
  ...
]

Please provide 2-3 valid SQL queries that best match the request, ordered from most relevant to least relevant.

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

      const content = response.choices[0].message.content;
      let queries;
      try {
        queries = JSON.parse(content);
      } catch (error) {
        console.error("[Parse Error] Failed to parse OpenAI response as JSON:", content);
        throw new Error("Failed to parse OpenAI response as valid JSON");
      }

      if (!Array.isArray(queries)) {
        throw new Error("OpenAI response is not an array of queries");
      }

      queries.forEach((query, index) => {
        if (!query.description || !query.sql) {
          throw new Error(`Query at index ${index} is missing required fields`);
        }
      });

      return queries;
    } catch (error) {
      console.error("[OpenAI Error]", error.response || error);
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }

  async explainQuery(query, schema) {
    await this.ensureInitialized(schema);
    const relevantDocs = await vectorStore.searchRelevant(query);
    const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
    
    const prompt = `Using this schema information:

${context}

Explain this SQL query in plain English:
${query}`;

    return this.generateCompletion(prompt);
  }
}

module.exports = new OpenAIConnector(); 