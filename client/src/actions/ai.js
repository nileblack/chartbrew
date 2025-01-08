import cookie from "react-cookies";
import { API_HOST } from "../config/settings";

export function generateQuery(description, schema) {
  const token = cookie.load("brewToken");
  if (!token) {
    return Promise.reject(new Error("No authentication token found"));
  }

  return fetch(`${API_HOST}/openai/generate-query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      description,
      schema,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error || "Failed to generate query");
        });
      }
      return response.json();
    })
    .catch((err) => {
      return Promise.reject(err);
    });
} 