import { useState, useEffect, useCallback } from 'react';
import { Settings, Users, Thermometer, FlaskConical, Repeat, Play, Download, Upload, Code, Sparkles, LayoutGrid, ListTodo, X, ShieldCheck, Zap } from 'lucide-react';
import schemaData from '../ezga-schema.json';
import { SchemaForm } from './components/SchemaForm';
import { Toolbox } from './components/Toolbox';
import { getDefaults } from './utils/schema';

const WORKFLOW_STEPS = [
  { id: 'setup', label: '1. Experiment Setup', sub: 'Global & Population', icon: Settings, sections: ['global', 'population'] },
  { id: 'physics', label: '2. Physics Engine', sub: 'Simulator & Thermostat', icon: Play, sections: ['simulator', 'thermostat'] },
  { id: 'goals', label: '3. Evolutionary Goals', sub: 'Evaluators & Objectives', icon: FlaskConical, sections: ['evaluator', 'multiobjective'] },
  { id: 'operators', label: '4. Genetic Variation', sub: 'Mutations & Crossovers', icon: Repeat, sections: ['variation', 'mutation_funcs', 'crossover_funcs'] },
  { id: 'search', label: '5. Hierarchical Search', sub: 'HiSE Supercells', icon: Sparkles, sections: ['hise'] },
];

function App() {
  const [data, setData] = useState<any>(null);
  const [activeStep, setActiveStep] = useState('setup');
  const [activeSection, setActiveSection] = useState('global');
  const [simpleMode, setSimpleMode] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    const defaults = getDefaults(schemaData, schemaData.$defs);
    setData(defaults);
  }, []);

  const handleToolboxAdd = useCallback((category: string, itemData: any) => {
    setData((prev: any) => {
      const newData = { ...prev };
      if (category === 'mutations') {
        newData.mutation_funcs = [...(prev.mutation_funcs || []), itemData];
        setActiveStep('operators');
        setActiveSection('mutation_funcs');
      } else if (category === 'calculators') {
        newData.simulator = { ...prev.simulator, calculator: itemData };
        setActiveStep('physics');
        setActiveSection('simulator');
      } else if (category === 'evaluators') {
        if (!newData.evaluator) newData.evaluator = {};
        newData.evaluator.objectives_funcs = [...(prev.evaluator?.objectives_funcs || []), itemData];
        setActiveStep('goals');
        setActiveSection('evaluator');
      }
      return newData;
    });
  }, []);

  const loadDiversityExplorer = useCallback(() => {
    const defaults = getDefaults(schemaData, schemaData.$defs);
    const nioData = {
      ...defaults,
      max_generations: 300,
      population: {
        ...defaults.population,
        constraints: [
          { factory: "within_range", kwargs: { name: "Ni", min: 1, max: 500 } },
          { factory: "within_range", kwargs: { name: "O", min: 0, max: 500 } }
        ],
        ef_bounds: [-20, 0],
        blacklist: ['H2_ALL', 'O2_ALL', 'H2O_ALL', "FLYING_H", "ISOLATED"],
      },
      evaluator: {
        features_funcs: [
          { factory: "composition_vector", kwargs: { species: ["Ni", "O"] } },
          { factory: "composition_vector", kwargs: { species: ["Ni", "O"] } }
        ],
        objectives_funcs: [
          { factory: "formation_energy", kwargs: {} },
          { factory: "formation_energy", kwargs: {} }
        ]
      },
      simulator: {
        mode: "sampling",
        calculator: {
          factory: "ase_calculator",
          kwargs: {
            calculator: { factory: "LJTorch", kwargs: {} },
            steps_max: 40,
            fmax: 1e-4
          }
        }
      },
      mutation_funcs: [
        { factory: "rattle", kwargs: { std: 0.1, species: ["Ni"] } },
        { factory: "rattle", kwargs: { std: 0.1, species: ["O"] } },
        { factory: "swap", kwargs: { ID1: "Ni", ID2: "O" } },
        { factory: "add", kwargs: { species: ["Ni"] } },
        { factory: "add", kwargs: { species: ["O"] } },
      ],
      hise: {
        supercells: [[1,1,1], [2,1,1], [2,2,1], [2,2,2], [4,2,2], [4,4,2], [4,4,4]],
        overrides: { max_generations: [5, 5, 5, 5, 5, 5, 10000] }
      }
    };
    setData(nioData);
    setSimpleMode(true);
    setActiveStep('setup');
    setActiveSection('global');
  }, []);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, []);

  if (!data) return (
    <div className="loading">
      <div className="spinner"></div>
      Loading Scientific Explorer...
    </div>
  );

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ezga-config.json';
    a.click();
  };

  const getActiveSchema = () => {
    const key = activeSection === 'selection' ? 'multiobjective' : activeSection;
    if (activeSection === 'global') {
      const props: any = {};
      const subsystemKeys = ['population', 'thermostat', 'evaluator', 'multiobjective', 'variation', 'simulator', 'convergence', 'hashmap', 'agentic', 'ensemble', 'hise', 'generative', 'mutation_funcs', 'crossover_funcs'];
      Object.keys(schemaData.properties).forEach(key => {
        if (!subsystemKeys.includes(key)) props[key] = (schemaData.properties as any)[key];
      });
      return { ...schemaData, properties: props };
    }
    return (schemaData.properties as any)[key] || (schemaData as any)[key];
  };

  return (
    <div className={`app-container ${!showPreview ? 'hide-preview' : ''}`}>
      {copyFeedback && <div className="notification glass fade-in">✓ Config copied to clipboard</div>}
      
      {showRunModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowRunModal(false)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Run Simulation</h3>
              <button className="reset-btn" onClick={() => setShowRunModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p>Execute your search with the following command:</p>
              <pre style={{ margin: '16px 0', background: 'rgba(0,0,0,0.3)' }}>
                python -m ezga.cli.run config.json
              </pre>
            </div>
            <div className="modal-footer">
              <button className="primary" onClick={() => setShowRunModal(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}

      <aside className="sidebar glass">
        <div className="logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div className="badge">EZGA</div>
            <h2 style={{ fontSize: '20px' }}>Explorer</h2>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.8 }}>Scientific Structure Search</p>
        </div>

        <Toolbox onAdd={handleToolboxAdd} />
        
        <nav style={{ flex: 1 }}>
          <div className="nav-group-label">WORKFLOW STEPS</div>
          {WORKFLOW_STEPS.map((step, idx) => (
            <div 
              key={step.id} 
              className={`nav-item-step ${activeStep === step.id ? 'active' : ''}`}
              onClick={() => {
                setActiveStep(step.id);
                setActiveSection(step.sections[0]);
              }}
            >
              <div className="step-number">{idx + 1}</div>
              <div className="step-info">
                <span className="step-label">{step.label.split('. ')[1]}</span>
                <span className="step-sub">{step.sub}</span>
              </div>
            </div>
          ))}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button className="secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }} onClick={loadDiversityExplorer}>
            <Sparkles size={16} style={{ marginRight: '8px' }} color="var(--accent-primary)" /> Ni–O Diversity
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
              <Upload size={14} style={{ marginRight: '6px' }} /> Import
            </button>
            <button className="primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }} onClick={handleDownload}>
              <Download size={14} style={{ marginRight: '6px' }} /> Export
            </button>
          </div>
          <button className="primary" style={{ width: '100%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.3)' }} onClick={() => setShowRunModal(true)}>
            <Play size={16} style={{ marginRight: '8px' }} /> Run Simulation
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar glass" style={{ border: 'none', background: 'rgba(255,255,255,0.02)', padding: '12px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '20px' }}>{WORKFLOW_STEPS.find(s => s.id === activeStep)?.label}</h1>
          </div>
          
          <div className="section-tabs" style={{ display: 'flex', gap: '8px' }}>
            {WORKFLOW_STEPS.find(s => s.id === activeStep)?.sections.map(section => (
              <div 
                key={section}
                className={`tab-item ${activeSection === section ? 'active' : ''}`}
                onClick={() => setActiveSection(section)}
              >
                {section.replace('_funcs', '').replace('_', ' ')}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="toggle-group">
              <div className={`toggle-item ${simpleMode ? 'active' : ''}`} onClick={() => setSimpleMode(true)}>
                <ListTodo size={14} />
              </div>
              <div className={`toggle-item ${!simpleMode ? 'active' : ''}`} onClick={() => setSimpleMode(false)}>
                <LayoutGrid size={14} />
              </div>
            </div>
            
            <button 
              className={`toggle-item glass ${showPreview ? 'active' : ''}`} 
              onClick={() => setShowPreview(!showPreview)}
              style={{ border: 'none', padding: '8px' }}
              title="Toggle JSON Preview"
            >
              <Code size={16} />
            </button>
          </div>
        </div>

        <div className="fade-in" style={{ padding: '24px' }}>
          <div className="glass" style={{ background: 'rgba(255, 255, 255, 0.01)', border: 'none' }}>
            <SchemaForm 
              schema={getActiveSchema()} 
              data={data} 
              onChange={setData} 
              definitions={schemaData.$defs}
              simpleMode={simpleMode}
            />
          </div>
        </div>
      </main>

      <aside className="preview-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code size={18} color="var(--accent-primary)" />
            <h3>Configuration</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="reset-btn" title="Copy Python Recipe" onClick={() => {
              const script = `# SPDX-License-Identifier: GPL-3.0-only
from ezga.hise.manager import run_hise
from ezga.factory import load_config

cfg_dict = ${JSON.stringify(data, null, 2)}

cfg = load_config(cfg_dict)
run_hise(cfg)`;
              handleCopy(script);
            }}>
              <Sparkles size={14} />
            </button>
            <button className="reset-btn" title="Reset Config" onClick={() => setData(getDefaults(schemaData, schemaData.$defs))}>
              <Repeat size={14} />
            </button>
          </div>
        </div>
        
        <div className="json-preview-container">
          <div className="json-header">
            <span>ezga-config.json</span>
            <button className="reset-btn" onClick={() => handleCopy(JSON.stringify(data, null, 2))} title="Copy JSON">
              <Download size={12} />
            </button>
          </div>
          <pre>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </aside>
    </div>
  );
}

export default App;
