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

function ConnectionExplorer() {
  const params = useParams();
  const dispatch = useDispatch();
  const connections = useSelector(selectConnections);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);

  // 获取当前连接
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
          // 设置默认选中第一个表
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

  if (loading || !connection) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner label="Loading connection..." />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 左侧表格列表 */}
      <div className="w-64 h-full border-r border-gray-200 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">数据表</h2>
        <div className="space-y-2">
          {connection.schema?.tables.map((tableName) => (
            <div
              key={tableName}
              className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                selectedTable === tableName ? 'bg-primary text-white' : ''
              }`}
              onClick={() => setSelectedTable(tableName)}
            >
              {tableName}
            </div>
          ))}
        </div>
      </div>

      {/* 右侧表格结构 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedTable ? (
          <div>
            <h2 className="text-2xl font-bold mb-4">{selectedTable}</h2>
            <Card className="p-4">
              <Table aria-label={`${selectedTable} structure`}>
                <TableHeader>
                  <TableColumn>字段名</TableColumn>
                  <TableColumn>类型</TableColumn>
                  <TableColumn>允许空值</TableColumn>
                  <TableColumn>默认值</TableColumn>
                  <TableColumn>主键</TableColumn>
                  <TableColumn>备注</TableColumn>
                </TableHeader>
                <TableBody>
                  {Object.entries(connection.schema.description[selectedTable]).map(([fieldName, field]) => (
                    <TableRow key={fieldName}>
                      <TableCell>{fieldName}</TableCell>
                      <TableCell>{field.type}</TableCell>
                      <TableCell>{field.allowNull ? "是" : "否"}</TableCell>
                      <TableCell>{field.defaultValue || "-"}</TableCell>
                      <TableCell>{field.primaryKey ? "是" : "否"}</TableCell>
                      <TableCell>{field.comment || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            请选择一个数据表
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectionExplorer; 