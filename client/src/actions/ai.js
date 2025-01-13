import cookie from "react-cookies";
import { API_HOST } from "../config/settings";

export function generateQuery(description, connection) {
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
      connection,
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

export function generateTableDescription(teamId, connectionId, tableName) {
  const token = cookie.load("brewToken");
  if (!token) {
    return Promise.reject(new Error("No authentication token found"));
  }

  return fetch(`${API_HOST}/teams/${teamId}/connections/${connectionId}/tables/${tableName}/describe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  })
    .then((response) => {
        console.log("response", response);
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error || "Failed to generate description");
        });
      }
      return response.json();
    })
    .catch((err) => {
      return Promise.reject(err);
    });
}

export function getTrainingData(teamId, connectionId, options = {}) {
  const token = cookie.load("brewToken");
  if (!token) {
    return Promise.reject(new Error("No authentication token found"));
  }

  return fetch(
    `${API_HOST}/teams/${teamId}/connection/${connectionId}/training-data${
      options.query ? `?query=${encodeURIComponent(options.query)}` : ''
    }`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  )
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error || "Failed to fetch training data");
        });
      }
      return response.json();
    })
    .catch((err) => {
      return Promise.reject(err);
    });
} 