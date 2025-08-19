import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rektefe API',
      version: '1.0.0',
      description: 'Backend API Documentation for Rektefe Project',
      contact: {
        name: 'Rektefe Team',
        email: 'info@rektefe.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
      {
        url: 'https://api.rektefe.com',
        description: 'Production Server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/models/*.ts', 
    './src/controllers/*.ts'
  ],
};

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
