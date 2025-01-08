const { OpenAIEmbeddings } = require('@langchain/openai');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const settings = process.env.NODE_ENV === "production" ? require("../settings") : require("../settings-dev");

class SchemaVectorStore {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: settings.openai.apiKey,
      modelName: "text-embedding-ada-002",
      configuration: {
        baseURL: settings.openai.endpoint,
        defaultHeaders: { 'OpenAI-Debug': 'true' },
        defaultQuery: { 'api-debug': 'true' },
      }
    });
    this.vectorStore = null;
  }

  prepareDocuments(schema) {
    const documents = [];
    for (const [idx, tableName] of Object.entries(schema.tables)) {
      const tableInfo = schema.description[tableName];
      // 构建表的基本信息
      const fields = Object.entries(tableInfo).map(([fieldName, info]) => ({
        name: fieldName,
        type: info.type,
        required: !info.allowNull,
        isPrimary: info.primaryKey,
        isAutoIncrement: info.autoIncrement,
      }));

      // 表的主要文档
      const tableDoc = `
TABLE ${tableName}
COLUMNS:
${fields.map(f => 
  `- ${f.name} ${f.type}${f.required ? ' NOT NULL' : ''}${f.isPrimary ? ' PRIMARY KEY' : ''}${f.isAutoIncrement ? ' AUTO_INCREMENT' : ''}`
).join('\n')}
      `.trim();

      documents.push({
        pageContent: tableDoc,
        metadata: { 
          tableName,
          type: 'table_schema'
        }
      });

      // SQL 示例文档
      const sqlExamples = `
Table: ${tableName}
Example queries:
1. SELECT * FROM ${tableName} WHERE ${fields.find(f => f.isPrimary)?.name || 'id'} = [value]
2. INSERT INTO ${tableName} (${fields.filter(f => !f.isAutoIncrement).map(f => f.name).join(', ')})
3. UPDATE ${tableName} SET [field] = [value] WHERE ${fields.find(f => f.isPrimary)?.name || 'id'} = [value]
      `.trim();

      documents.push({
        pageContent: sqlExamples,
        metadata: { 
          tableName,
          type: 'sql_examples'
        }
      });

      // 字段用途文档
      const fieldsDoc = `
Table ${tableName} field purposes:
${fields.map(f => `${f.name}: ${f.type} - Used for storing ${f.name.toLowerCase().includes('time') ? 'timestamp' : 
                   f.name.toLowerCase().includes('id') ? 'identifier' : 
                   f.type.includes('VARCHAR') ? 'text data' : 
                   f.type.includes('INT') ? 'numeric value' : 
                   f.type.includes('DECIMAL') ? 'decimal number' : 'data'}`
).join('\n')}
      `.trim();

      documents.push({
        pageContent: fieldsDoc,
        metadata: { 
          tableName,
          type: 'field_purposes'
        }
      });
    }

    return documents;
  }

  async initialize(schema) {
    const documents = this.prepareDocuments(schema);
    this.vectorStore = await MemoryVectorStore.fromDocuments(
      documents,
      this.embeddings
    );
    console.log(`Initialized vector store with ${documents.length} documents`);
  }

  async searchRelevant(query, k = 5) {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    const results = await this.vectorStore.similaritySearch(query, k);
    return results;
  }
}

module.exports = new SchemaVectorStore(); 