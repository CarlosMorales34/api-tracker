import { env } from '../infrastructure/config/env';
import { getMysqlPool } from '../infrastructure/database/mysql/mysql-connection';
import { createServer } from '../infrastructure/http/express/create-server';

const pool = getMysqlPool();
const app = createServer(pool);

app.listen(env.port, () => {
  console.log(`vitalis api listening on port ${env.port}`);
});
