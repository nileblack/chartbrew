const Sequelize = require("sequelize");
const populateConnectionTeamId = require("../scripts/populateDatasetTeamId");

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn("Connection", "team_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      reference: {
        model: "Team",
        key: "id",
        onDelete: "cascade",
      },
    });

    await queryInterface.addColumn("Connection", "project_ids", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await populateConnectionTeamId.up();
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Connection", "team_id");
    await queryInterface.removeColumn("Connection", "project_ids");
  }
};