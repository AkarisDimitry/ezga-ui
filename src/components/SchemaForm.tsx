import React from 'react';
import { ChevronRight, ChevronDown, Info, X, RotateCcw, FileSearch, Sparkles } from 'lucide-react';

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
  const?: any;
}

interface SchemaFormProps {
  schema: any;
  data: any;
  onChange: (newData: any) => void;
  definitions: Record<string, any>;
}

// Predefined EZGA Mutations for "Simple" selection
const MUTATION_PRESETS: Record<string, any> = {
  "rattle": {
    "factory": "rattle",
    "kwargs": { "std": 0.1, "species": [], "components": [0,1,2] }
  },
  "swap": {
    "factory": "swap",
    "kwargs": { "ID1": "C", "ID2": "O", "N": 1 }
  },
  "add": {
    "factory": "add",
    "kwargs": { "species": ["H"], "collision_tolerance": 2.0 }
  },
  "remove": {
    "factory": "remove",
    "kwargs": { "species": "H", "N": 1 }
  },
  "strain": {
    "factory": "strain",
    "kwargs": { "max_strain": 0.1 }
  }
};

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

  // Handle anyOf
  const [anyOfIndex, setAnyOfIndex] = React.useState(0);
  if (prop.anyOf) {
    // If it's just [type, null], we already handle it by picking the non-null one in previous version
    // But now we want to support actual multiple types (Mutation variants)
    const options = prop.anyOf.map((opt, i) => {
      let resolved = opt;
      if (opt.$ref) {
        const refKey = opt.$ref.split('/').pop() || '';
        resolved = definitions[refKey];
      }
      return { ...resolved, originalIndex: i };
    });

    // Simple heuristic: if value exists, try to find which anyOf it matches
    // For now, let's just let the user pick if there are multiple "real" options
    const filteredOptions = options.filter(opt => opt.type !== 'null');
    
    if (filteredOptions.length > 1) {
       return (
         <div className={`field-container anyOf-field level-${level}`}>
           <div className="anyOf-selector">
              <label className="field-label">{prop.title || name} (Type):</label>
              <select 
                value={anyOfIndex} 
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  setAnyOfIndex(idx);
                  // Reset value to default of the new type
                  onChange(filteredOptions[idx].default || (filteredOptions[idx].type === 'object' ? {} : ''));
                }}
              >
                {filteredOptions.map((opt, i) => (
                  <option key={i} value={i}>{opt.title || opt.type || `Option ${i+1}`}</option>
                ))}
              </select>
           </div>
           <SchemaField 
             name={name}
             property={filteredOptions[anyOfIndex]}
             value={value}
             onChange={onChange}
             definitions={definitions}
             level={level}
           />
         </div>
       );
    } else if (filteredOptions.length === 1) {
      prop = { ...prop, ...filteredOptions[0] };
    }
  }

  const label = prop.title || name;
  const description = prop.description;
  const isModified = value !== undefined && value !== prop.default;
  const isTemperature = label.toLowerCase().includes('temperature');
  const isPath = prop.format === 'path' || name.toLowerCase().endsWith('_path');
  const isMutationList = name === 'mutation_funcs';

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
          {isMutationList && <Sparkles size={14} className="accent-icon" />}
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
          
          <div className="add-actions">
            {isMutationList ? (
              <div className="preset-selector">
                <select 
                  onChange={(e) => {
                    const preset = MUTATION_PRESETS[e.target.value];
                    if (preset) onChange([...(value || []), preset]);
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>+ Quick Add Mutation...</option>
                  {Object.keys(MUTATION_PRESETS).map(m => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                  <option value="custom">Custom Object</option>
                </select>
              </div>
            ) : (
              <button 
                className="add-item-btn"
                onClick={() => {
                  const defaultVal = prop.items.default !== undefined ? prop.items.default : (prop.items.type === 'object' ? {} : '');
                  onChange([...(value || []), defaultVal]);
                }}
              >
                + Add Item
              </button>
            )}
          </div>
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
              if (file) onChange(file.name);
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
