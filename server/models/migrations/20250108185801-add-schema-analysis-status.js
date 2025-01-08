const Sequelize = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn("Connection", "schemaAnalysisStatus", {
      type: Sequelize.ENUM('idle', 'running', 'completed', 'failed'),
      defaultValue: 'idle',
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Connection", "schemaAnalysisStatus");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Connection_schemaAnalysisStatus";');
  },
};