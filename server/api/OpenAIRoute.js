const openaiConnector = require("../modules/openaiConnector");
const verifyToken = require("../modules/verifyToken");

module.exports = (app) => {
  /*
  ** Route to generate SQL query from natural language
  */
  app.post("/openai/generate-query", verifyToken, async (req, res) => {
    try {
      const { description, connection } = req.body;
      
      if (!description || !connection) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const query = await openaiConnector.generateSqlQuery(description, connection);
      return res.status(200).json({ query });
    } catch (error) {
      console.error("Error generating query:", error);
      return res.status(500).json({ error: error.message });
    }
  });
  // -------------------------------------------

  /*
  ** Route to explain SQL query in natural language
  */
  app.post("/openai/explain-query", verifyToken, async (req, res) => {
    try {
      const { query, schema } = req.body;
      
      if (!query || !schema) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const explanation = await openaiConnector.explainQuery(query, schema);
      return res.status(200).json({ explanation });
    } catch (error) {
      console.error("Error explaining query:", error);
      return res.status(500).json({ error: error.message });
    }
  });
  // -------------------------------------------

  return (req, res, next) => {
    next();
  };
}; 