import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'https://fugu-website-m99b.vercel.app',
      'https://fugu-website-m99b.vercel.app/','http://localhost:3000',
    ],
    credentials: true,
  });

  app.enableShutdownHooks();

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Fugu Threads API')
    .setDescription('Backend for the Fugu Threads e-commerce storefront')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, () =>
    SwaggerModule.createDocument(app, config),
  );

  await app.listen(process.env.PORT ?? 5000);
  console.log(`Server running on http://localhost:${process.env.PORT ?? 5000}`);
}

bootstrap();
