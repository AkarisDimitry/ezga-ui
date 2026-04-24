export function getDefaults(schema: any, definitions: any): any {
  if (schema.$ref) {
    const refKey = schema.$ref.split('/').pop();
    return getDefaults(definitions[refKey], definitions);
  }

  if (schema.default !== undefined) {
    return schema.default;
  }

  if (schema.type === 'object') {
    const obj: any = {};
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        obj[key] = getDefaults(prop, definitions);
      }
    }
    return obj;
  }

  if (schema.type === 'array') {
    return [];
  }

  if (schema.anyOf) {
    const nonNull = schema.anyOf.find((t: any) => t.type !== 'null');
    if (nonNull) return getDefaults(nonNull, definitions);
  }

  return null;
}
