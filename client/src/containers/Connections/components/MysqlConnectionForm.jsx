import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  Button, Input, Link, Spacer, Chip, Tabs, Tab, Divider, Switch, Select, SelectItem,
  CircularProgress,
} from "@nextui-org/react";
import { FaExternalLinkSquareAlt } from "react-icons/fa";
import AceEditor from "react-ace";
import { useTranslation } from "react-i18next";

import "ace-builds/src-min-noconflict/mode-json";
import "ace-builds/src-min-noconflict/theme-tomorrow";
import "ace-builds/src-min-noconflict/theme-one_dark";

import Text from "../../../components/Text";
import Container from "../../../components/Container";
import Row from "../../../components/Row";
import { useTheme } from "../../../modules/ThemeContext";
import { RiArrowRightSLine } from "react-icons/ri";
import { useDispatch } from "react-redux";
import { useParams } from "react-router";
import { testRequest, testRequestWithFiles } from "../../../slices/connection";
import { LuCircleCheck, LuUpload } from "react-icons/lu";

const formStrings = {
  mysql: {
    csPlaceholder: "mysql://username:password@mysql.example.com:3306/dbname",
    csDescription: "mysql://username:password@mysql.example.com:3306/dbname",
    hostname: "mysql.example.com",
  },
  rdsMysql: {
    csPlaceholder: "mysql://[USERNAME]:[PASSWORD]@[HOSTNAME]:[PORT]/[DB_NAME]",
    csDescription: "mysql://[USERNAME]:[PASSWORD]@[HOSTNAME]:[PORT]/[DB_NAME]",
    hostname: "example-database.ref.region.rds.amazonaws.com",
  },
};

/*
  The Form for creating a new Mysql connection
*/
function MysqlConnectionForm(props) {
  const {
    editConnection, onComplete, addError, subType,
  } = props;

  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [connection, setConnection] = useState({ type: "mysql" });
  const [errors, setErrors] = useState({});
  const [formStyle, setFormStyle] = useState("string");
  const [testResult, setTestResult] = useState(null);
  const [sslCerts, setSslCerts] = useState({
    sslCa: null,
    sslCert: null,
    sslKey: null,
  });
  const [sslCertsErrors, setSslCertsErrors] = useState({
    sslCa: null,
    sslCert: null,
    sslKey: null,
  });

  const { isDark } = useTheme();
  const dispatch = useDispatch();
  const params = useParams();
  const initRef = useRef(null);

  const { t: originalT } = useTranslation();
  const t = (key, params = {}) =>  originalT(`mysqlConnectionForm.${key}`, params);

  useEffect(() => {
    if (editConnection?.id && !initRef.current) {
      initRef.current = true;
      _init();
    }
  }, [editConnection]);

  useEffect(() => {
    if (connection.subType !== subType && !editConnection) {
      setConnection({ ...connection, subType });
    }
  }, [subType]);

  const _init = () => {
    const newConnection = { ...editConnection };

    if (!newConnection.connectionString && newConnection.host) {
      setFormStyle("form");
    }

    setConnection({ ...newConnection });
  };

  const _onTestRequest = async (data) => {
    const newTestResult = {};
    let response;

    if (data.ssl && sslCerts.sslCa) {
      response = await dispatch(testRequestWithFiles({
        team_id: params.teamId,
        connection: data,
        files: sslCerts
      }));
    } else {
      response = await dispatch(testRequest({ team_id: params.teamId, connection: data }));
    }

    newTestResult.status = response.payload.status;
    newTestResult.body = await response.payload.text();

    try {
      newTestResult.body = JSON.parse(newTestResult.body);
      newTestResult.body = JSON.stringify(newTestResult, null, 2);
    } catch (e) {
      // the response is not in JSON format
    }

    setTestResult(newTestResult);
    return Promise.resolve(newTestResult);
  };

  const _onCreateConnection = (test = false) => {
    setErrors({});

    if (!connection.name || connection.name.length > 24) {
      setTimeout(() => {
        setErrors({ ...errors, name: t("Enter name") });
      }, 100);
      return;
    }
    if (formStyle === "form" && !connection.host) {
      setTimeout(() => {
        setErrors({ ...errors, host: t("Enter host") });
      }, 100);
      return;
    }
    if (formStyle === "string" && !connection.connectionString) {
      setTimeout(() => {
        setErrors({ ...errors, connectionString: t("Enter connection string") });
      }, 100);
      return;
    }

    const newConnection = connection;
    // Clean the connection string if the form style is Form
    if (formStyle === "form") {
      newConnection.connectionString = "";
    }

    setConnection(newConnection);
    setTimeout(() => {
      if (test === true) {
        setTestLoading(true);
        _onTestRequest(newConnection)
          .then(() => setTestLoading(false))
          .catch(() => setTestLoading(false));
      } else {
        setLoading(true);
        onComplete(newConnection, sslCerts)
          .then(() => setLoading(false))
          .catch(() => setLoading(false));
      }
    }, 100);
  };

  const isValidExtension = (fileName, validExtensions = [".crt", ".key", ".pem"]) => {
    return validExtensions.some(extension => fileName.toLowerCase().endsWith(extension));
  };

  const isValidFileSize = (file, maxSizeInBytes = 8192) => { // 8KB max size
    return file.size <= maxSizeInBytes;
  };

  const _selectRootCert = (e) => {
    const file = e.target.files[0];
    if (!isValidExtension(file.name)) {
      setSslCertsErrors({ ...sslCertsErrors, sslCa: t("Invalid file type") });
      return;
    }
    if (!isValidFileSize(file)) {
      setSslCertsErrors({ ...sslCertsErrors, sslCa: t("File too large") });
      return;
    }

    setSslCerts({ ...sslCerts, sslCa: file });
  };

  const _selectClientCert = (e) => {
    const file = e.target.files[0];
    if (!isValidExtension(file.name)) {
      setSslCertsErrors({ ...sslCertsErrors, sslCert: t("Invalid file type") });
      return;
    }
    if (!isValidFileSize(file)) {
      setSslCertsErrors({ ...sslCertsErrors, sslCert: t("File too large") });
      return;
    }
    setSslCerts({ ...sslCerts, sslCert: file });
  };

  const _selectClientKey = (e) => {
    const file = e.target.files[0];
    if (!isValidExtension(file.name)) {
      setSslCertsErrors({ ...sslCertsErrors, sslKey: t("Invalid key file") });
      return;
    }
    if (!isValidFileSize(file)) {
      setSslCertsErrors({ ...sslCertsErrors, sslKey: t("File too large") });
      return;
    }
    setSslCerts({ ...sslCerts, sslKey: file });
  };

  const _onChangeSSL = (checked) => {
    if (checked && !connection.sslMode) {
      setConnection({ ...connection, ssl: checked, sslMode: "require" });
    } else {
      setConnection({ ...connection, ssl: checked });
    }
  };

  if (editConnection && !connection.id) {
    return <CircularProgress aria-label="Loading connection" />;
  }

  return (
    <div className="p-4 bg-content1 border-1 border-solid border-content3 rounded-lg">
      <div>
        <p className="font-semibold">
          {!editConnection && t("Add new connection")}
          {editConnection && t("Edit connection with name", { name: editConnection.name })}
        </p>
        <Spacer y={4} />
        <Row align="center" style={styles.formStyle}>
          <Tabs
            selectedKey={formStyle}
            onSelectionChange={(key) => setFormStyle(key)}
          >
            <Tab key="string" title={t("Connection string tab")} />
            <Tab key="form" title={t("Connection form tab")} />
          </Tabs>
        </Row>
        <Spacer y={2} />

        {formStyle === "string" && (
          <>
            <Row align="center">
              <Input
                label={t("Name label")}
                placeholder={t("Name placeholder")}
                value={connection.name || ""}
                onChange={(e) => {
                  setConnection({ ...connection, name: e.target.value });
                }}
                color={errors.name ? "danger" : "default"}
                variant="bordered"
                fullWidth
              />
            </Row>
            {errors.name && (
              <Row css={{ p: 5 }}>
                <Text small className="text-danger">
                  {errors.name}
                </Text>
              </Row>
            )}
            <Spacer y={2} />
            <Row align="center">
              <Input
                label={t("Enter MySQL connection string")}
                placeholder={formStrings[subType].csPlaceholder}
                description={t("Connection string description")}
                value={connection.connectionString || ""}
                onChange={(e) => {
                  setConnection({ ...connection, connectionString: e.target.value });
                }}
                variant="bordered"
                fullWidth
              />
            </Row>
            {errors.connectionString && (
              <Row className={"p-5"}>
                <Text small className="text-danger">
                  {errors.connectionString}
                </Text>
              </Row>
            )}
            <Spacer y={2} />
          </>
        )}

        {formStyle === "form" && (
          <Row>
            <div className="grid grid-cols-12 gap-2">
              <div className="sm:col-span-12 md:col-span-8">
                <Input
                  label={t("Name label")}
                  placeholder={t("Name placeholder")}
                  value={connection.name || ""}
                  onChange={(e) => {
                    setConnection({ ...connection, name: e.target.value });
                  }}
                  color={errors.name ? "danger" : "default"}
                  description={errors.name}
                  variant="bordered"
                  fullWidth
                />
              </div>

              <div className="sm:col-span-12 md:col-span-10">
                <Input
                  label="Hostname or IP address"
                  placeholder={formStrings[subType].hostname}
                  value={connection.host || ""}
                  onChange={(e) => {
                    setConnection({ ...connection, host: e.target.value });
                  }}
                  color={errors.host ? "danger" : "default"}
                  description={errors.host}
                  variant="bordered"
                  fullWidth
                />
              </div>
              <div className="sm:col-span-12 md:col-span-2">
                <Input
                  label={t("Port")}
                  placeholder={t("Optional port")}
                  value={connection.port || ""}
                  onChange={(e) => {
                    setConnection({ ...connection, port: e.target.value });
                  }}
                  color={errors.port ? "danger" : "default"}
                  description={errors.port}
                  variant="bordered"
                  fullWidth
                />
              </div>

              <div className="sm:col-span-12 md:col-span-4">
                <Input
                  label="Database name"
                  value={connection.dbName || ""}
                  onChange={(e) => {
                    setConnection({ ...connection, dbName: e.target.value });
                  }}
                  color={errors.dbName ? "danger" : "default"}
                  description={errors.dbName}
                  variant="bordered"
                  fullWidth
                />
              </div>

              <div className="sm:col-span-12 md:col-span-4">
                <Input
                  label="Database username"
                  value={connection.username || ""}
                  onChange={(e) => {
                    setConnection({ ...connection, username: e.target.value });
                  }}
                  color={errors.username ? "danger" : "default"}
                  description={errors.username}
                  variant="bordered"
                  fullWidth
                />
              </div>

              <div className="sm:col-span-12 md:col-span-4">
                <Input
                  type="password"
                  label="Database password"
                  onChange={(e) => {
                    setConnection({ ...connection, password: e.target.value });
                  }}
                  color={errors.password ? "danger" : "default"}
                  description={errors.password}
                  variant="bordered"
                  fullWidth
                />
              </div>
            </div>
          </Row>
        )}
        <Spacer y={2} />
        <Row align="center">
          <Switch
            label="SSL"
            isSelected={connection.ssl || false}
            checked={connection.ssl || false}
            onChange={(e) => _onChangeSSL(e.target.checked)}
            size="sm"
          >
            {t("Enable SSL")}
          </Switch>
        </Row>
        {connection.ssl && (
          <>
            <Spacer y={2} />
            <Row align="center">
              <Select
                variant="bordered"
                label="SSL Mode"
                selectedKeys={[connection.sslMode]}
                onSelectionChange={(keys) => {
                  setConnection({ ...connection, sslMode: keys.currentKey });
                }}
                className="w-full md:w-1/2 lg:w-1/3"
                size="sm"
                selectionMode="single"
                disallowEmptySelection
              >
                <SelectItem key="require" textValue="Require">{t("Require")}</SelectItem>
                <SelectItem key="disable" textValue="Disable">{t("Disable")}</SelectItem>
                <SelectItem key="prefer" textValue="Prefer">{t("Prefer")}</SelectItem>
                <SelectItem key="verify-ca" textValue="Verify CA">{t("Verify CA")}</SelectItem>
                <SelectItem key="verify-full" textValue="Verify Full">{t("Verify Full")}</SelectItem>
              </Select>
            </Row>
            <Spacer y={2} />
            <Row align="center">
              <input
                type="file"
                id="rootCertInput"
                style={{ display: "none" }}
                onChange={_selectRootCert}
              />
              <Button
                variant="ghost"
                startContent={<LuUpload />}
                onClick={() => document.getElementById("rootCertInput").click()}
              >
                {"Certificate authority"}
              </Button>
              <Spacer x={2} />
              {sslCerts.sslCa && (
                <span className="text-sm">{sslCerts.sslCa.name}</span>
              )}
              {sslCertsErrors.sslCa && (
                <span className="text-sm text-danger">
                  {sslCertsErrors.sslCa}
                </span>
              )}
              {!sslCertsErrors.sslCa && connection.sslCa && (
                <LuCircleCheck className="text-success" size={20} />
              )}
            </Row>
            <Spacer y={2} />
            <Row align="center">
              <input
                type="file"
                id="clientCertInput"
                style={{ display: "none" }}
                onChange={_selectClientCert}
              />
              <Button
                variant="ghost"
                startContent={<LuUpload />}
                onClick={() => document.getElementById("clientCertInput").click()}
              >
                {"SSL certificate"}
              </Button>
              <Spacer x={2} />
              {sslCerts.sslCert && (
                <span className="text-sm">{sslCerts.sslCert.name}</span>
              )}
              {sslCertsErrors.sslCert && (
                <span className="text-sm text-danger">
                  {sslCertsErrors.sslCert}
                </span>
              )}
              {!sslCertsErrors.sslCert && connection.sslCert && (
                <LuCircleCheck className="text-success" size={20} />
              )}
            </Row>
            <Spacer y={2} />
            <Row align="center">
              <input
                type="file"
                id="clientKeyInput"
                style={{ display: "none" }}
                onChange={_selectClientKey}
              />
              <Button
                variant="ghost"
                startContent={<LuUpload />}
                onClick={() => document.getElementById("clientKeyInput").click()}
              >
                {"SSL key"}
              </Button>
              <Spacer x={2} />
              {sslCerts.sslKey && (
                <span className="text-sm">{sslCerts.sslKey.name}</span>
              )}
              {sslCertsErrors.sslKey && (
                <span className="text-sm text-danger">
                  {sslCertsErrors.sslKey}
                </span>
              )}
              {!sslCertsErrors.sslKey && connection.sslKey && (
                <LuCircleCheck className="text-success" size={20} />
              )}
            </Row>
            <Spacer y={2} />
            <Row align="center">
              <span className="text-sm">
                {t("Certificate formats")}
              </span>
            </Row>
          </>
        )}

        <Spacer y={4} />
        <FormGuides subType={subType} />

        {addError && (
          <Row>
            <Container className={"bg-danger-100 p-10"}>
              <Row>
                <Text h5>{"Server error while trying to save your connection"}</Text>
              </Row>
              <Row>
                <Text>Please try adding your connection again.</Text>
              </Row>
            </Container>
          </Row>
        )}

        <Spacer y={4} />
        <Row>
          <Button
            variant="ghost"
            auto
            onClick={() => _onCreateConnection(true)}
            isLoading={testLoading}
          >
            {"Test connection"}
          </Button>
          <Spacer x={1} />
          <Button
            isLoading={loading}
            onClick={_onCreateConnection}
            color="primary"
          >
            {"Save connection"}
          </Button>
        </Row>
      </div>

      {testResult && !testLoading && (
        <>
          <Spacer y={4} />
          <Divider />
          <Spacer y={4} />
          <div>
            <Row align="center">
              <Text>
                {"Test Result "}
              </Text>
              <Spacer x={2} />
              <Chip
                color={testResult.status < 400 ? "success" : "danger"}
                size="sm"
              >
                {`Status code: ${testResult.status}`}
              </Chip>
            </Row>
            <Spacer y={4} />
            <AceEditor
              mode="json"
              theme={isDark ? "one_dark" : "tomorrow"}
              style={{ borderRadius: 10 }}
              height="150px"
              width="none"
              value={testResult.body || "Hello"}
              readOnly
              name="queryEditor"
              editorProps={{ $blockScrolling: true }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function FormGuides({ subType }) {
  if (subType === "rdsMysql") {
    return (
      <>
        <Row align="center">
          <RiArrowRightSLine />
          <Spacer x={1} />
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href="https://chartbrew.com/blog/how-to-connect-and-visualize-amazon-rds-with-chartbrew/#ensure-your-database-user-has-read-only-access-optional-but-recommended"
          >
            <Text>{"For security reasons, connect to your MySQL database with read-only credentials"}</Text>
          </Link>
          <Spacer x={1} />
          <FaExternalLinkSquareAlt size={12} />
        </Row>
        <Row align="center">
          <RiArrowRightSLine />
          <Spacer x={1} />
          <Link
            href="https://chartbrew.com/blog/how-to-connect-and-visualize-amazon-rds-with-chartbrew/#adjust-your-rds-instance-to-allow-remote-connections"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Text>{"Find out how to allow remote connections to your MySQL database"}</Text>
          </Link>
          <Spacer x={1} />
          <FaExternalLinkSquareAlt size={12} />
        </Row>
      </>
    );
  }

  return (
    <>
      <Row align="center">
        <RiArrowRightSLine />
        <Spacer x={1} />
        <Link
          target="_blank"
          rel="noopener noreferrer"
          href="https://www.digitalocean.com/community/tutorials/how-to-create-a-new-user-and-grant-permissions-in-mysql"
        >
          <Text>{"For security reasons, connect to your MySQL database with read-only credentials"}</Text>
        </Link>
        <Spacer x={1} />
        <FaExternalLinkSquareAlt size={12} />
      </Row>
      <Row align="center">
        <RiArrowRightSLine />
        <Spacer x={1} />
        <Link
          href="https://www.cyberciti.biz/tips/how-do-i-enable-remote-access-to-mysql-database-server.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Text>{"Find out how to allow remote connections to your MySQL database"}</Text>
        </Link>
        <Spacer x={1} />
        <FaExternalLinkSquareAlt size={12} />
      </Row>
    </>
  )
}

FormGuides.propTypes = {
  subType: PropTypes.string.isRequired,
};

const styles = {
  container: {
    flex: 1,
  },
  mainSegment: {
    padding: 20,
  },
  formStyle: {
    marginTop: 20,
    marginBottom: 20,
  },
  helpList: {
    display: "inline-block",
  },
  saveBtn: {
    marginRight: 0,
  },
};

MysqlConnectionForm.defaultProps = {
  onComplete: () => {},
  editConnection: null,
  addError: false,
  subType: "postgres",
};

MysqlConnectionForm.propTypes = {
  onComplete: PropTypes.func,
  editConnection: PropTypes.object,
  addError: PropTypes.bool,
  subType: PropTypes.string,
};

export default MysqlConnectionForm;
