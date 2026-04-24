import { useState, useEffect } from 'react';
import { Settings, Users, Thermometer, FlaskConical, Repeat, Play, Download, Upload, Code } from 'lucide-react';
import schemaData from '../ezga-schema.json';
import { SchemaForm } from './components/SchemaForm';
import { getDefaults } from './utils/schema';

const SECTIONS = [
  { id: 'global', label: 'Global Settings', icon: Settings },
  { id: 'population', label: 'Population', icon: Users },
  { id: 'thermostat', label: 'Thermostat', icon: Thermometer },
  { id: 'evaluator', label: 'Evaluator', icon: FlaskConical },
  { id: 'variation', label: 'Variation', icon: Repeat },
  { id: 'simulator', label: 'Simulator', icon: Play },
];

function App() {
  const [data, setData] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('global');

  useEffect(() => {
    const defaults = getDefaults(schemaData, schemaData.$defs);
    setData(defaults);
  }, []);

  if (!data) return <div className="loading">Loading Schema...</div>;

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ezga-config.json';
    a.click();
  };

  const getActiveSchema = () => {
    if (activeSection === 'global') {
      // Return top level properties except subsystems
      const props: any = {};
      const subsystemKeys = ['population', 'thermostat', 'evaluator', 'multiobjective', 'variation', 'simulator', 'convergence', 'hashmap', 'agentic', 'ensemble', 'hise', 'generative'];
      
      Object.keys(schemaData.properties).forEach(key => {
        if (!subsystemKeys.includes(key)) {
          props[key] = (schemaData.properties as any)[key];
        }
      });
      return { ...schemaData, properties: props };
    }
    
    // For subsystems, the key name in schema might differ slightly (e.g. selection vs multiobjective)
    const key = activeSection === 'selection' ? 'multiobjective' : activeSection;
    return (schemaData.properties as any)[key];
  };

  return (
    <div className="app-container">
      <aside className="sidebar glass">
        <div className="logo">
          <h2 style={{ color: 'var(--accent-primary)', marginBottom: '8px' }}>EZGA</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Scientific Explorer</p>
        </div>
        
        <nav>
          {SECTIONS.map(s => (
            <div 
              key={s.id} 
              className={`nav-item ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              <s.icon size={18} style={{ marginRight: '10px' }} />
              {s.label}
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button className="secondary" style={{ width: '100%', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={16} style={{ marginRight: '8px' }} /> Import JSON
          </button>
          <button className="primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleDownload}>
            <Download size={16} style={{ marginRight: '8px' }} /> Export Config
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="fade-in">
          <h1 style={{ marginBottom: '24px' }}>{SECTIONS.find(s => s.id === activeSection)?.label}</h1>
          <div className="glass" style={{ background: 'transparent' }}>
            <SchemaForm 
              schema={getActiveSchema()} 
              data={data} 
              onChange={setData} 
              definitions={schemaData.$defs}
            />
          </div>
        </div>
      </main>

      <aside className="preview-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Code size={18} color="var(--accent-primary)" />
          <h3>JSON Preview</h3>
        </div>
        <pre>
          {JSON.stringify(data, null, 2)}
        </pre>
      </aside>
    </div>
  );
}

export default App;
