
# JSON Schema to Zod

**JSON Schema to Zod is a TypeScript library that converts JSON Schemas into Zod schemas, enabling dynamic validation of data structures.** This utility is particularly useful in scenarios where JSON Schemas are stored in databases and need to be dynamically converted into Zod schemas for validation, providing flexibility in your code.

## Installation

Install the package using pnpm:

```bash
pnpm add @dmitryrechkin/json-schema-to-zod
```

## Features

- **Dynamic Schema Generation**: Convert JSON Schemas into Zod schemas on the fly, making your code more adaptable to changing data structures.
- **Supports Complex Schemas**: Handles various schema types, including strings, numbers, objects, arrays, and combinators like `oneOf`, `anyOf`, and `allOf`.
- **Serverless Ready**: Works seamlessly in serverless environments like Cloudflare Workers.
- **No Alternatives**:  While the popular `json-schema-to-typescript` is designed for generating static TypeScript types from JSON Schemas, it falls short in dynamic use cases where schemas need to be generated and used at runtime. This limitation makes it less flexible for scenarios where JSON Schemas are stored in databases or require real-time validation, which is where `@dmitryrechkin/json-schema-to-zod` excels.

## Usage

### Basic Conversion

```typescript
import { JSONSchemaToZod } from '@dmitryrechkin/json-schema-to-zod';

const jsonSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        age: { type: 'number', minimum: 0 },
    },
    required: ['name', 'age'],
};

const zodSchema = JSONSchemaToZod.convert(jsonSchema);

// Now you can use `zodSchema` to validate data
const parsedData = zodSchema.parse({
    name: 'John Doe',
    age: 30,
});

console.log(parsedData);
// Output: { name: 'John Doe', age: 30 }
```

### Handling Complex Schemas

```typescript
const complexJsonSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        contact: {
            type: 'object',
            properties: {
                email: { type: 'string', format: 'email' },
                phone: { type: 'string', pattern: '^\+?[1-9]\d{1,14}$' }
            },
            required: ['email']
        },
    },
    required: ['name'],
};

const complexZodSchema = JSONSchemaToZod.convert(complexJsonSchema);

// Validate complex data structures dynamically
const complexParsedData = complexZodSchema.parse({
    name: 'Jane Doe',
    contact: {
        email: 'jane.doe@example.com',
        phone: '+1234567890',
    },
});

console.log(complexParsedData);
// Output: { name: 'Jane Doe', contact: { email: 'jane.doe@example.com', phone: '+1234567890' } }
```

### Using Combinators

```typescript
const combinatorJsonSchema = {
    oneOf: [
        { type: 'string' },
        { type: 'number' },
    ]
};

const combinatorZodSchema = JSONSchemaToZod.convert(combinatorJsonSchema);

// Validate data that can be of multiple types
console.log(combinatorZodSchema.parse('Hello World'));
// Output: "Hello World"

console.log(combinatorZodSchema.parse(42));
// Output: 42
```

## Rationale

The `JSONSchemaToZod` class is designed to dynamically generate Zod schemas from JSON Schemas, which can be particularly useful in environments where JSON Schemas are stored in databases and need to be validated at runtime. This approach offers unparalleled flexibility compared to other solutions like `json-schema-to-typescript` that generate static TypeScript types, which are not suitable for dynamic use cases. Additionally, the library is built to work seamlessly in serverless environments like Cloudflare Workers, making it an excellent choice for modern web applications.

## Installation & Setup

Install the package using pnpm:

```bash
pnpm add @dmitryrechkin/json-schema-to-zod
```

Ensure that your project is set up to handle TypeScript and supports ES modules, as this library is built with modern JavaScript standards.

## Contributing

Contributions are welcome! Feel free to fork this project and submit pull requests. Before submitting, please ensure your code passes all linting and unit tests.

You can run unit tests using:

```bash
pnpm test
```
