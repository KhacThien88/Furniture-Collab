require("./app/tracing/tracing")
const app = require("./app");
const logger = require("./log/logger");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info({ message: `Server is running on port ${PORT} ` });
  console.log(`Server is running on http://localhost:${PORT}`);
});
