import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Spinner, Card, Input, Button } from "@nextui-org/react";
import { Accordion, AccordionItem } from "@nextui-org/accordion";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell
} from "@nextui-org/react";
import { selectConnections, getConnection, saveConnection, analyzeSchema, getSchemaAnalysisStatus } from "../../slices/connection";
import Navbar from "../../components/Navbar";
import { Link } from "react-router-dom";
import { LuCircleArrowLeft, LuSearch, LuBrain, LuDatabase } from "react-icons/lu";
import { Spacer } from "@nextui-org/react";
import { CardHeader, CardBody } from "@nextui-org/react";
import { generateTableDescription } from "../../actions/ai";
import { toast } from "react-hot-toast";
import { marked } from 'marked';

function ConnectionExplorer() {
  const params = useParams();
  const dispatch = useDispatch();
  const connections = useSelector(selectConnections);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tableDescription, setTableDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get current connection
  const connection = connections?.find((c) => c.id === parseInt(params.connectionId, 10));

  // 处理表格选择
  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    // 如果该表有描述，则更新描述
    if (connection?.schema?.tableDescriptions?.[tableName]) {
      setTableDescription(marked.parse(connection.schema.tableDescriptions[tableName]));
    } else {
      setTableDescription('');
    }
  };

  useEffect(() => {
    if (params.teamId && params.connectionId) {
      dispatch(getConnection({ 
        team_id: params.teamId,
        connection_id: params.connectionId
      }))
        .unwrap()
        .then(() => {
          setLoading(false);
          // 设置默认选中的表格
          if (connection?.schema?.tables?.length > 0) {
            handleTableSelect(connection.schema.tables[0]);
          }
        })
        .catch((err) => {
          console.error("Error loading connection", err);
          setLoading(false);
        });
    }
  }, [params.teamId, params.connectionId]);

  const filteredTables = connection?.schema?.tables.filter(tableName =>
    tableName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const generateAIDescription = async () => {
    if (!selectedTable) return;
    
    setIsGenerating(true);
    generateTableDescription(params.teamId, params.connectionId, selectedTable)
      .then((data) => {
        const {description, fields } = data.description;
        setTableDescription(marked.parse(description));

        // 更新 connection 中的字段注释
        if (fields) {
          const updatedSchema = {
            ...connection.schema,
            // 添加或更新表描述
            tableDescriptions: {
              ...connection.schema.tableDescriptions,
              [selectedTable]: description
            },
            description: {
              ...connection.schema.description,
              [selectedTable]: Object.fromEntries(
                fields.map(field => [
                  field.name,
                  {
                    ...connection.schema.description[selectedTable][field.name],
                    comment: field.comment
                  }
                ])
              )
            }
          };

          // 使用已有的 saveConnection action
          dispatch(saveConnection({ 
            team_id: params.teamId, 
            connection: {
              ...connection,
              schema: updatedSchema
            }
          }));
        }

        toast.success("Description generated successfully!");
      })
      .catch((error) => {
        toast.error(error?.message || "Could not generate description");
        console.error("Error generating description:", error);
      })
      .finally(() => {
        setIsGenerating(false);
      });
  };

  const startSchemaAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      await dispatch(analyzeSchema({ 
        team_id: params.teamId,
        connection_id: params.connectionId 
      })).unwrap();
      
      toast.success("Schema analysis started");
      
      // Poll for status
      const interval = setInterval(async () => {
        const { status } = await dispatch(getSchemaAnalysisStatus({ 
          team_id: params.teamId,
          connection_id: params.connectionId 
        })).unwrap();
        
        if (status === 'completed') {
          clearInterval(interval);
          setIsAnalyzing(false);
          // Refresh connection data
          dispatch(getConnection({ 
            team_id: params.teamId,
            connection_id: params.connectionId 
          }));
          toast.success("Schema analysis completed");
        } else if (status === 'failed') {
          clearInterval(interval);
          setIsAnalyzing(false);
          toast.error("Schema analysis failed");
        }
      }, 5000);
    } catch (error) {
      setIsAnalyzing(false);
      toast.error(error?.message || "Could not start analysis");
    }
  };

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
              <div className="w-64 border-r border-content3 p-4">
                <h2 className="text-xl font-semibold mb-4">Tables</h2>
                
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="Search tables..."
                    variant="bordered"
                    endContent={<LuSearch />}
                    className="max-w-[300px]"
                    labelPlacement="outside"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2 overflow-y-auto h-[calc(100vh-340px)] pr-2 custom-scrollbar">
                  {filteredTables.map((tableName) => (
                    <div
                      key={tableName}
                      className={`p-2 rounded cursor-pointer hover:bg-content2 ${
                        selectedTable === tableName ? 'bg-primary text-white' : ''
                      }`}
                      onClick={() => handleTableSelect(tableName)}
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
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-semibold">{selectedTable}</h2>
                      <div className="flex gap-2">
                        <Button
                          color="primary"
                          variant="flat"
                          startContent={<LuBrain />}
                          isLoading={isGenerating}
                          onPress={generateAIDescription}
                        >
                          Generate AI Description
                        </Button>
                        <Button
                          color="secondary"
                          variant="flat"
                          startContent={<LuDatabase />}
                          isLoading={isAnalyzing}
                          onPress={startSchemaAnalysis}
                          isDisabled={connection?.schemaAnalysisStatus === 'running'}
                        >
                          {isAnalyzing ? "Analyzing..." : "Analyze Database Structure"}
                        </Button>
                      </div>
                    </div>
                    
                    {tableDescription && (
                      <Accordion className="mb-4">
                        <AccordionItem
                          key="table-description"
                          aria-label="Table Description"
                          title="Table Description"
                          className="bg-content1"
                        >
                          <div 
                            className="prose prose-sm dark:prose-invert max-w-none markdown-content"
                            dangerouslySetInnerHTML={{ __html: tableDescription }} 
                          />
                        </AccordionItem>
                      </Accordion>
                    )}

                    <Card>
                      <CardBody>
                        <Table 
                          aria-label={`${selectedTable} structure`}
                          removeWrapper
                          className="min-w-full"
                        >
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
                      </CardBody>
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