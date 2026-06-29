import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module.js';
import { StandardErrorFilter } from './filters/standard-error.filter.js';
import { accessLogMiddleware } from './middleware/access-log.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';

const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.API_CORS_ORIGIN;

const app = await NestFactory.create(AppModule);
app.use(requestIdMiddleware);
app.use(accessLogMiddleware);
app.useGlobalFilters(new StandardErrorFilter());
app.enableCors({
  origin: corsOrigin
    ? corsOrigin.split(',').map((origin) => origin.trim())
    : [/^http:\/\/127\.0\.0\.1:\d+$/, /^http:\/\/localhost:\d+$/],
});

await app.listen(port);

console.log(`Group Messaging Inventory API listening on http://127.0.0.1:${port}`);
