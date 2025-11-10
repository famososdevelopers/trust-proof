# Justificación de la ausencia de documentación Swagger/OpenAPI

## Contexto del proyecto
- TrustProof es una aplicación React + Supabase.
- Supabase provee autenticación, base de datos PostgreSQL y un API REST/GraphQL generado automáticamente a partir del esquema.
- El frontend consume directamente ese API autogenerado mediante el SDK oficial (`@supabase/supabase-js`), sin capas intermedias propias.

## ¿Por qué no hay endpoints propios?
- El backend no está desarrollado como un servicio HTTP personalizado (por ejemplo, Express, Fastify o Nest).  
- No existen controladores ni rutas bajo nuestro control; todas las operaciones CRUD se resuelven invocando al cliente Supabase, que traduce las consultas a SQL y las ejecuta en la infraestructura del proveedor.
- Cuando se requiere lógica adicional, Supabase permite hooks (Policies, Triggers) y funciones RPC, pero en este proyecto no se han definido funciones RPC expuestas como endpoints.

## Implicaciones para Swagger/OpenAPI
- Swagger/OpenAPI describe APIs HTTP que el equipo desarrolla y administra.  
- Dado que los endpoints los genera Supabase y no se exponen mediante nuestro propio servidor, no tenemos un artefacto OpenAPI que describa esos recursos.  
- Documentar manualmente la API autogenerada sería redundante y propenso a desviaciones: si cambia el esquema de la base de datos, Supabase actualiza sus endpoints de forma automática.

## Conclusión
No contamos con documentación Swagger porque el proyecto se apoya al 100 % en el API gestionado de Supabase. Como no controlamos ni publicamos endpoints personalizados, no tendría sentido mantener un contrato OpenAPI. En su lugar, optamos por documentar el flujo funcional y la estructura de datos, dejando abierta la posibilidad de incorporar Swagger cuando existan endpoints propios o funciones RPC/Edge que lo justifiquen.***
</analysis> ***!

