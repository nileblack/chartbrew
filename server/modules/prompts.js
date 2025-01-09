const SQL_GENERATION_PROMPT = (tableSummaryString, description, dbType, language) => `Based on the following relevant schema information:

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
d. verify the functions are supported by the database, database type is ${dbType}

step three: generate description
a. generate the description in ${language}

step four: return the result
a. Returns a list of SQL queries in the following JSON format:
[
  {
    "description": "A clear explanation of what this query does",
    "sql": "The SQL query statement", 
    "tables": ["list", "of", "tables", "used"],
    "confidence": 0.95
  },
  ...
]

Please return a JSON array with 2-3 valid SQL queries that best match the request, ordered from most relevant to least relevant.

IMPORTANT: 
- Verify that every field and table used in the queries exists in the schema tables
- Include the fields object to document which fields are used from each table
- DO NOT return any other text or comments, just the JSON array`;

const TABLE_COMMENT_PROMPT = (tableName, fields) => `For the table "${tableName}", please analyze all fields and generate appropriate field descriptions.
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

const TABLE_DESCRIPTION_PROMPT = (tableName, fieldDescriptions) => `Based on the following database table structure:

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

module.exports = {
    SQL_GENERATION_PROMPT,
    TABLE_COMMENT_PROMPT,
    TABLE_DESCRIPTION_PROMPT
}; 