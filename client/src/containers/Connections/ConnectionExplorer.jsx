import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Spinner, Card } from "@nextui-org/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell
} from "@nextui-org/react";
import { selectConnections, getConnection } from "../../slices/connection";
import Navbar from "../../components/Navbar";
import { Link } from "react-router-dom";
import { LuCircleArrowLeft } from "react-icons/lu";
import { Spacer } from "@nextui-org/react";
import { CardHeader, CardBody } from "@nextui-org/react";

function ConnectionExplorer() {
  const params = useParams();
  const dispatch = useDispatch();
  const connections = useSelector(selectConnections);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);

  // Get current connection
  const connection = connections?.find((c) => c.id === parseInt(params.connectionId, 10));

  useEffect(() => {
    if (params.teamId && params.connectionId) {
      dispatch(getConnection({ 
        team_id: params.teamId,
        connection_id: params.connectionId
      }))
        .unwrap()
        .then(() => {
          setLoading(false);
          // Set default selected table
          if (connection?.schema?.tables?.length > 0) {
            setSelectedTable(connection.schema.tables[0]);
          }
        })
        .catch((err) => {
          console.error("Error loading connection", err);
          setLoading(false);
        });
    }
  }, [params.teamId, params.connectionId]);

  if (!params.teamId || !params.connectionId) {
    return <div>Missing required parameters</div>;
  }

  return (
    <div>
      <Navbar hideTeam transparent />
      <div>
        <div className="p-4 sm:mr-96">
          <div className="flex flex-row items-center gap-2">
            <Link to="/connections" className="text-xl text-secondary font-semibold">
              <LuCircleArrowLeft size={24} />
            </Link>
            <span className="text-xl font-semibold">Connection Explorer</span>
          </div>
          <Spacer y={4} />

          {loading || !connection ? (
            <div className="flex items-center justify-center">
              <Spinner label="Loading connection..." />
            </div>
          ) : (
            <div className="flex h-[calc(100vh-200px)]">
              {/* Left side - Table list */}
              <div className="w-64 border-r border-content3 p-4 overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">Tables</h2>
                <div className="space-y-2">
                  {connection.schema?.tables.map((tableName) => (
                    <div
                      key={tableName}
                      className={`p-2 rounded cursor-pointer hover:bg-content2 ${
                        selectedTable === tableName ? 'bg-primary text-white' : ''
                      }`}
                      onClick={() => setSelectedTable(tableName)}
                    >
                      {tableName}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right side - Table structure */}
              <div className="flex-1 p-4 overflow-y-auto">
                {selectedTable ? (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">{selectedTable}</h2>
                    <Card>
                      <Table aria-label={`${selectedTable} structure`}>
                        <TableHeader>
                          <TableColumn>Field</TableColumn>
                          <TableColumn>Type</TableColumn>
                          <TableColumn>Nullable</TableColumn>
                          <TableColumn>Default</TableColumn>
                          <TableColumn>Primary Key</TableColumn>
                          <TableColumn>Comment</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(connection.schema.description[selectedTable]).map(([fieldName, field]) => (
                            <TableRow key={fieldName}>
                              <TableCell>{fieldName}</TableCell>
                              <TableCell>{field.type}</TableCell>
                              <TableCell>{field.allowNull ? "Yes" : "No"}</TableCell>
                              <TableCell>{field.defaultValue || "-"}</TableCell>
                              <TableCell>{field.primaryKey ? "Yes" : "No"}</TableCell>
                              <TableCell>{field.comment || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    Please select a table
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="hidden sm:block fixed top-0 right-0 z-40 w-96 h-screen" aria-label="Sidebar">
          <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
            <div className="flex flex-col gap-2 p-2">
              <Spacer y={10} />
              <Card>
                <CardHeader className="flex flex-col items-start">
                  <p className="font-semibold">About Connection Explorer</p>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-gray-500">
                    Here you can explore the structure of your database tables and their fields.
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ConnectionExplorer; 