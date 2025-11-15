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
        url: process.env.SERVER_URL || 'http://localhost:3000',
        description: 'Development Server',
      },
      {
        url: 'https://dev-production-8a3d.up.railway.app',
        description: 'Railway Production Server',
      },
      {
        url: 'https://api.rektefe.com',
        description: 'Production Server (Future)',
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
