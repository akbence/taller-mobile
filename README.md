Backend api generation:
Based on Openapi:

npx @openapitools/openapi-generator-cli generate   -i ../../taller-backend/build/openapi/openapi.yaml   -g typescript-axios   -o src/services/generated   --additional-properties=apiPackage=api,modelPackage=model,supportsES6=true,withSeparateModelsAndApi=true,modelPropertyNaming=camelCase,useFormData=true