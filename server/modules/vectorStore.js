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

  async getDocuments(filter) {
    try {
      const collection = await this.getCollection();
      
      // 修改查询条件格式，使用 $and 操作符
      const where = {
        $and: [
          { team_id: { $eq: filter.where.team_id } },
          { connection_id: { $eq: filter.where.connection_id } }
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
}

// 创建单例实例
const instance = new SchemaVectorStore();
module.exports = instance; 