import React from 'react';
import { ChevronRight, ChevronDown, Info, X, RotateCcw, FileSearch } from 'lucide-react';

interface SchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  default?: any;
  enum?: any[];
  items?: any;
  properties?: Record<string, any>;
  $ref?: string;
  anyOf?: any[];
  format?: string;
  minimum?: number;
  maximum?: number;
}

interface SchemaFormProps {
  schema: any;
  data: any;
  onChange: (newData: any) => void;
  definitions: Record<string, any>;
}

const SchemaField: React.FC<{
  name: string;
  property: SchemaProperty;
  value: any;
  onChange: (val: any) => void;
  definitions: Record<string, any>;
  level: number;
}> = ({ name, property, value, onChange, definitions, level }) => {
  // Resolve $ref if present
  let prop = { ...property };
  if (prop.$ref) {
    const refKey = prop.$ref.split('/').pop() || '';
    prop = { ...prop, ...definitions[refKey] };
  }

  // Handle anyOf (mostly for null | type)
  if (prop.anyOf) {
    const nonNullType = prop.anyOf.find((t: any) => t.type !== 'null');
    if (nonNullType) {
      if (nonNullType.$ref) {
        const refKey = nonNullType.$ref.split('/').pop() || '';
        prop = { ...prop, ...definitions[refKey] };
      } else {
        prop = { ...prop, ...nonNullType };
      }
    }
  }

  const label = prop.title || name;
  const description = prop.description;
  const isModified = value !== undefined && value !== prop.default;
  const isTemperature = label.toLowerCase().includes('temperature');
  const isPath = prop.format === 'path' || name.toLowerCase().endsWith('_path');

  const [isExpanded, setIsExpanded] = React.useState(level < 1);

  const renderLabel = () => (
    <div className="field-header-info">
      <span className="field-label">{label}</span>
      {description && (
        <div className="tooltip">
          <Info size={14} />
          <span className="tooltiptext">{description}</span>
        </div>
      )}
      {isModified && (
        <button 
          className="reset-btn" 
          onClick={(e) => { e.stopPropagation(); onChange(prop.default); }}
          title="Reset to default"
        >
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );

  // Render based on type
  if (prop.type === 'object') {
    return (
      <div className={`field-container object-field level-${level}`}>
        <div className="field-header" onClick={() => setIsExpanded(!isExpanded)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {renderLabel()}
          </div>
        </div>
        {isExpanded && (
          <div className="field-children">
            {Object.entries(prop.properties || {}).map(([childName, childProp]) => (
              <SchemaField
                key={childName}
                name={childName}
                property={childProp}
                value={value?.[childName]}
                onChange={(val) => onChange({ ...value, [childName]: val })}
                definitions={definitions}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (prop.type === 'array') {
    return (
      <div className={`field-container array-field level-${level}`}>
        <div className="field-header">
          {renderLabel()}
        </div>
        <div className="array-items">
          {Array.isArray(value) && value.map((item, idx) => (
            <div key={idx} className="array-item-wrapper">
               <div className="array-item-content">
                <SchemaField
                  name={`${idx}`}
                  property={prop.items}
                  value={item}
                  onChange={(val) => {
                    const newArr = [...value];
                    newArr[idx] = val;
                    onChange(newArr);
                  }}
                  definitions={definitions}
                  level={level + 1}
                />
               </div>
               <button 
                className="remove-item-btn"
                onClick={() => {
                  const newArr = value.filter((_, i) => i !== idx);
                  onChange(newArr);
                }}
               >
                 <X size={14} />
               </button>
            </div>
          ))}
          <button 
            className="add-item-btn"
            onClick={() => {
              const defaultVal = prop.items.default !== undefined ? prop.items.default : (prop.items.type === 'object' ? {} : '');
              onChange([...(value || []), defaultVal]);
            }}
          >
            + Add to {label}
          </button>
        </div>
      </div>
    );
  }

  if (prop.enum) {
    return (
      <div className="field-container primitive-field">
        {renderLabel()}
        <select value={value ?? prop.default ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>Select {label}...</option>
          {prop.enum.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (prop.type === 'boolean') {
    return (
      <div className="field-container primitive-field checkbox-field">
        {renderLabel()}
        <div className="switch-wrapper">
          <input 
            type="checkbox" 
            checked={value ?? prop.default ?? false} 
            onChange={(e) => onChange(e.target.checked)} 
            id={`switch-${name}-${level}`}
          />
          <label htmlFor={`switch-${name}-${level}`} className="switch-label"></label>
        </div>
      </div>
    );
  }

  if (prop.type === 'number' || prop.type === 'integer') {
    if (isTemperature) {
      const min = prop.minimum ?? 0;
      const max = prop.maximum ?? 2000;
      const step = prop.type === 'integer' ? 1 : 0.1;
      return (
        <div className="field-container primitive-field slider-field">
          {renderLabel()}
          <div className="slider-wrapper">
            <input 
              type="range" 
              min={min} 
              max={max} 
              step={step}
              value={value ?? prop.default ?? min} 
              onChange={(e) => onChange(prop.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))} 
            />
            <input 
              type="number" 
              className="slider-value"
              value={value ?? prop.default ?? min}
              onChange={(e) => onChange(prop.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="field-container primitive-field">
        {renderLabel()}
        <input 
          type="number" 
          value={value ?? prop.default ?? 0} 
          step={prop.type === 'integer' ? 1 : 0.01}
          onChange={(e) => onChange(prop.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))} 
        />
      </div>
    );
  }

  if (isPath) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    return (
      <div className="field-container primitive-field path-field">
        {renderLabel()}
        <div className="path-wrapper">
          <input 
            type="text" 
            value={value ?? prop.default ?? ''} 
            placeholder="/path/to/file..."
            onChange={(e) => onChange(e.target.value)} 
          />
          <button className="browse-btn" onClick={() => fileInputRef.current?.click()}>
            <FileSearch size={16} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onChange(file.name); // In a real app, this might be more complex
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="field-container primitive-field">
      {renderLabel()}
      <input 
        type="text" 
        value={value ?? prop.default ?? ''} 
        onChange={(e) => onChange(e.target.value)} 
      />
    </div>
  );
};

export const SchemaForm: React.FC<SchemaFormProps> = ({ schema, data, onChange, definitions }) => {
  let finalSchema = { ...schema };
  if (finalSchema.$ref) {
    const refKey = finalSchema.$ref.split('/').pop() || '';
    finalSchema = { ...finalSchema, ...definitions[refKey] };
  }

  return (
    <div className="schema-form fade-in">
      {Object.entries(finalSchema.properties || {}).map(([name, property]) => (
        <SchemaField
          key={name}
          name={name}
          property={property}
          value={data?.[name]}
          onChange={(val) => onChange({ ...data, [name]: val })}
          definitions={definitions}
          level={0}
        />
      ))}
    </div>
  );
};
