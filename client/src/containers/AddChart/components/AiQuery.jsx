import React, { useState } from "react";
import { toast } from "react-hot-toast";
import PropTypes from "prop-types";
import { Button, Input, Spacer } from "@nextui-org/react";
import { LuPlay } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import Text from "../../../components/Text";
import { generateQuery } from "../../../actions/ai";

function AiQuery({ connection, schema, query, updateQuery, type }) {
    const { t: originalT } = useTranslation();
    const t = (key) => originalT(`aiQuery.${key}`);
    const [loading, setLoading] = useState(false);
    const [description, setDescription] = useState("");
    const [queryOptions, setQueryOptions] = useState([]);
    console.log("query", query, schema, type);
  const _onGenerateQuery = () => {
    if (!description) {
      toast.error(t("Please enter a description of what you want to query"));
      return;
    }

    if (!schema) {
      toast.error(t("Database schema not available"));
      return;
    }

    setLoading(true);
    generateQuery(description, connection)
      .then((response) => {
        setQueryOptions(response.query.data.queries);
        toast.success(t("Queries generated successfully!"));
      })
      .catch((error) => {
        toast.error(error?.message || t("Could not generate queries"));
        console.error("Error generating queries:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="flex flex-col gap-4">
      <Text>{t("AI Query Generator")}</Text>
      <div className="flex flex-col gap-2">
        <Text small>{t("Describe what you want to query in natural language:")}</Text>
        <Input
          placeholder={t("Example: Show me the total number of users registered in the last 30 days")}
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
        {t("Generate Query")}
      </Button>
      
      {queryOptions.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          <Text>{t("Generated Queries:")}</Text>
          {queryOptions.map((option, index) => (
            <div key={index} className="flex flex-col gap-2 p-4 border rounded-lg">
              <Text small>{option.description}</Text>
              <Text small className="text-gray-500">{option.sql}</Text>
              <Text small className="text-gray-500">{t("Confidence:")} {(option.confidence * 100).toFixed(1)}%</Text>
              <Button 
                size="sm" 
                onPress={() => updateQuery(option.sql)}
                color="secondary"
              >
                {t("Use This Query")}
              </Button>
            </div>
          ))}
        </div>
      )}
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