import React, { useState } from "react";
import { toast } from "react-hot-toast";
import PropTypes from "prop-types";
import { Button, Input, Spacer } from "@nextui-org/react";
import { LuPlay } from "react-icons/lu";

import Text from "../../../components/Text";
import { generateQuery } from "../../../actions/ai";

function AiQuery({ schema, query, updateQuery, type }) {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  console.log("query", query, schema, type);
  const _onGenerateQuery = () => {
    if (!description) {
      toast.error("Please enter a description of what you want to query");
      return;
    }

    if (!schema) {
      toast.error("Database schema not available");
      return;
    }

    setLoading(true);
    generateQuery(description, schema)
      .then((response) => {
        updateQuery(response.query);
        toast.success("Query generated successfully!");
      })
      .catch((error) => {
        toast.error(error?.message || "Could not generate query");
        console.error("Error generating query:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="flex flex-col gap-4">
      <Text>AI Query Generator</Text>
      <div className="flex flex-col gap-2">
        <Text small>Describe what you want to query in natural language:</Text>
        <Input
          placeholder="Example: Show me the total number of users registered in the last 30 days"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") _onGenerateQuery();
          }}
          variant="bordered"
          fullWidth
          disabled={loading}
        />
      </div>
      <Spacer y={2} />
      <Button
        onPress={_onGenerateQuery}
        isLoading={loading}
        color="primary"
        endContent={<LuPlay />}
        fullWidth
      >
        Generate Query
      </Button>
    </div>
  );
}

AiQuery.propTypes = {
  schema: PropTypes.object.isRequired,
  query: PropTypes.string,
  updateQuery: PropTypes.func.isRequired,
  type: PropTypes.string,
};

export default AiQuery;