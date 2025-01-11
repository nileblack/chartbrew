import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { connect, useSelector } from "react-redux";
import {
  Spacer,
} from "@nextui-org/react";
import { useTranslation } from "react-i18next";

import WebhookIntegrations from "./components/WebhookIntegrations";
import {
  getTeamIntegrations as getTeamIntegrationsAction,
} from "../../actions/integration";
import Text from "../../components/Text";
import Row from "../../components/Row";
import Segment from "../../components/Segment";
import { selectTeam } from "../../slices/team";

function Integrations(props) {
  const { integrations, getTeamIntegrations } = props;
  const { t: originalT } = useTranslation();
  const t = (key) => originalT(`integrations.${key}`);

  const team = useSelector(selectTeam);
  const initRef = useRef(false);

  useEffect(() => {
    if (team?.id && !initRef.current) {
      getTeamIntegrations(team?.id);
      initRef.current = true;
    }
  }, [team]);

  return (
    <div>
      <Segment className="container mx-auto bg-background">
        <Row>
          <Text size="h3">{t("Integrations")}</Text>
        </Row>
        <Spacer y={1} />
        <Row>
          <Text>
            {t("Create integrations description")}
          </Text>
        </Row>
        <Spacer y={4} />

        <Row>
          <WebhookIntegrations
            integrations={integrations ? integrations.filter((i) => i.type === "webhook") : []}
            teamId={team?.id}
          />
        </Row>
        <Spacer y={4} />
      </Segment>
    </div>
  );
}

Integrations.propTypes = {
  integrations: PropTypes.arrayOf(PropTypes.object).isRequired,
  getTeamIntegrations: PropTypes.func.isRequired,
  match: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  integrations: state.integration.data,
});

const mapDispatchToProps = (dispatch) => ({
  getTeamIntegrations: (teamId) => dispatch(getTeamIntegrationsAction(teamId)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Integrations);
