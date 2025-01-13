const { ChromaClient } = require("chromadb");

class SchemaVectorStore {
  constructor() {
    this.client = null;
    this.collection = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // 使用默认配置创建内存中的客户端实例
      this.client = new ChromaClient();

      // 获取或创建集合
      this.collection = await this.client.getOrCreateCollection({
        name: "schema_store",
        metadata: {
          "description": "Store for database schema and training data"
        }
      });

      this.initialized = true;
      console.log("ChromaDB initialized successfully in memory mode");
    } catch (error) {
      console.error("ChromaDB initialization error:", error);
      throw new Error("Failed to initialize ChromaDB: " + error.message);
    }

  }

  async getCollection() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.collection;
  }

  async getDocuments(team_id, connection_id) {
    try {
      const collection = await this.getCollection();

      const where = {
        $and: [
          { team_id: { $eq: team_id } },
          { connection_id: { $eq: connection_id } }
        ]
      };

      const results = await collection.get({
        where: where,
        limit: 10
      });

      if (!results.documents.length) {
        return [];
      }

      return results.documents.map((doc, index) => ({
        pageContent: doc,
        metadata: results.metadatas[index]
      }));
    } catch (error) {
      console.error("Error fetching documents:", error);
      return []; // 如果出错返回空数组
    }
  }

  async addDocument(content, metadata) {
    try {
      const collection = await this.getCollection();
      await collection.add({
        documents: [content],
        metadatas: [metadata],
        ids: [`${metadata.team_id}-${metadata.connection_id}-${Date.now()}`]
      });
    } catch (error) {
      console.error("Error adding document:", error);
      throw new Error("Failed to add document to ChromaDB");
    }
  }

  async similaritySearch(team_id, connection_id, query, limit = 10) {
    try {
      const collection = this.collection;

      // 执行相似度搜索
      const results = await collection.query({
        where: {$and: [
          {team_id: team_id},
          {connection_id: connection_id}
        ]},
        queryTexts: [query],
        nResults: limit,
      });

      // 如果没有结果，返回空数组
      if (!results || !results.documents || !results.documents[0]) {
        return [];
      }

      // 格式化返回结果
      return results.documents[0].map((content, index) => ({
        pageContent: content,
        metadata: results.metadatas[0][index],
        score: results.distances ? 1 - results.distances[0][index] : null
      }));

    } catch (error) {
      console.error('Error in similarity search:', error);
      throw error;
    }
  }
}

// 创建单例实例
const instance = new SchemaVectorStore();
module.exports = instance; 