import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, Search, Plus, Trash2, Edit2, Save, BookOpen, Brain, Settings,
  ChevronDown, ChevronUp, Eye, EyeOff, MessageSquarePlus, List,
  Check, Minimize2, Maximize2
} from "lucide-react";
import * as RAG from "../lib/rag";
import { QAPair, RagDoc } from "../lib/rag";

interface RagConfigProps {
  onClose: () => void;
  onMinimize: () => void;
}

export default function RagConfig({ onClose, onMinimize }: RagConfigProps) {
  const [activeTab, setActiveTab] = useState<"docs" | "qa" | "skills">("docs");
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [qaCategories, setQaCategories] = useState<string[]>(["geral"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("geral");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [skills, setSkills] = useState<Record<string, boolean>>({
    rag: true,
    qa: true,
    sentinela: true,
    vision: false,
    proto: false,
    links: false,
  });

  // Carregar dados no mount
  useEffect(() => {
    loadQAPairs();
    loadDocs();
  }, []);

  const loadQAPairs = useCallback(() => {
    const pairs = RAG.listQAPairs();
    setQaPairs(pairs);
    const cats = new Set(["geral", ...pairs.map(q => q.category)]);
    setQaCategories(Array.from(cats));
  }, []);

  const loadDocs = useCallback(() => {
    // Carregar documentos da base
    const allDocs = RAG.CORE_DOCS || [];
    setDocs(allDocs);
  }, []);

  const filteredQAPairs = useMemo(() => {
    return qaPairs.filter(pair => {
      const matchesSearch = pair.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          pair.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "geral" || pair.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [qaPairs, searchQuery, selectedCategory]);

  const filteredDocs = useMemo(() => {
    return docs.filter(doc => 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.body.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [docs, searchQuery]);

  const handleAddQAPair = useCallback(() => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    
    RAG.addQAPair(newQuestion, newAnswer, selectedCategory);
    loadQAPairs();
    setNewQuestion("");
    setNewAnswer("");
  }, [newQuestion, newAnswer, selectedCategory, loadQAPairs]);

  const handleRemoveQAPair = useCallback((id: string) => {
    RAG.removeQAPair(id);
    loadQAPairs();
  }, [loadQAPairs]);

  const handleEditQAPair = useCallback((pair: QAPair) => {
    setEditingId(pair.id);
    setNewQuestion(pair.question);
    setNewAnswer(pair.answer);
    setSelectedCategory(pair.category);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !newQuestion.trim() || !newAnswer.trim()) return;
    
    RAG.updateQAPair(editingId, {
      question: newQuestion,
      answer: newAnswer,
      category: selectedCategory,
    });
    loadQAPairs();
    setEditingId(null);
    setNewQuestion("");
    setNewAnswer("");
  }, [editingId, newQuestion, newAnswer, selectedCategory, loadQAPairs]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setNewQuestion("");
    setNewAnswer("");
  }, []);

  const handleAddCategory = useCallback(() => {
    if (!newCategory.trim() || qaCategories.includes(newCategory)) return;
    setQaCategories([...qaCategories, newCategory]);
    setSelectedCategory(newCategory);
    setNewCategory("");
  }, [newCategory, qaCategories]);

  const handleToggleSkill = useCallback((skill: string) => {
    setSkills(prev => ({
      ...prev,
      [skill]: !prev[skill]
    }));
  }, []);

  const handleAddDoc = useCallback(() => {
    // Placeholder para adicionar novo documento
    // Poderia abrir um modal ou form
  }, []);

  return (
    <div className={`rag-config-window ${isExpanded ? 'expanded' : ''}`}>
      <div className="rag-header">
        <div className="rag-title">
          <Brain size={20} />
          <span>Configuração do RAG</span>
        </div>
        <div className="rag-actions">
          <button onClick={onMinimize} className="rag-btn-icon" title="Minimizar">
            <Minimize2 size={16} />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="rag-btn-icon" title="Expandir">
            {isExpanded ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={onClose} className="rag-btn-icon rag-btn-close" title="Fechar">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="rag-tabs">
        <button 
          className={`rag-tab ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          <BookOpen size={16} /> Documentos
        </button>
        <button 
          className={`rag-tab ${activeTab === 'qa' ? 'active' : ''}`}
          onClick={() => setActiveTab('qa')}
        >
          <MessageSquarePlus size={16} /> Q&A
        </button>
        <button 
          className={`rag-tab ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          <Settings size={16} /> Skills
        </button>
      </div>

      <div className="rag-content">
        {activeTab === 'docs' && (
          <div className="rag-docs">
            <div className="rag-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="rag-docs-list">
              {filteredDocs.length > 0 ? (
                filteredDocs.map(doc => (
                  <div key={doc.id} className="rag-doc-card">
                    <div className="rag-doc-header">
                      <span className="rag-doc-id">{doc.id}</span>
                      <div className="rag-doc-tags">
                        {doc.tags.map(tag => (
                          <span key={tag} className="rag-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <h3 className="rag-doc-title">{doc.title}</h3>
                    <p className="rag-doc-body">{doc.body.slice(0, 200)}...</p>
                  </div>
                ))
              ) : (
                <div className="rag-empty">
                  <p>Nenhum documento encontrado</p>
                </div>
              )}
            </div>

            <button className="rag-btn-add" onClick={handleAddDoc}>
              <Plus size={16} /> Adicionar Documento
            </button>
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="rag-qa">
            <div className="rag-qa-header">
              <div className="rag-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar Q&A..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="rag-category-filter">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {qaCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nova categoria"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button onClick={handleAddCategory} className="rag-btn-small">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="rag-qa-list">
              {filteredQAPairs.length > 0 ? (
                filteredQAPairs.map(pair => (
                  <div key={pair.id} className="rag-qa-card">
                    <div className="rag-qa-question">
                      <span className="rag-qa-q">Q:</span>
                      {pair.question}
                    </div>
                    <div className="rag-qa-answer">
                      <span className="rag-qa-a">A:</span>
                      {pair.answer}
                    </div>
                    <div className="rag-qa-meta">
                      <span className="rag-qa-category">{pair.category}</span>
                      <div className="rag-qa-actions">
                        <button onClick={() => handleEditQAPair(pair)} className="rag-btn-icon-small">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleRemoveQAPair(pair.id)} className="rag-btn-icon-small rag-btn-danger">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rag-empty">
                  <p>Nenhum par Q&A encontrado</p>
                </div>
              )}
            </div>

            <div className="rag-qa-form">
              <h4>{editingId ? 'Editar Q&A' : 'Adicionar Q&A'}</h4>
              <div className="rag-form-row">
                <input
                  type="text"
                  placeholder="Pergunta..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                />
              </div>
              <div className="rag-form-row">
                <textarea
                  placeholder="Resposta..."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="rag-form-actions">
                {editingId ? (
                  <>
                    <button className="rag-btn rag-btn-save" onClick={handleSaveEdit}>
                      <Save size={16} /> Salvar
                    </button>
                    <button className="rag-btn rag-btn-cancel" onClick={handleCancelEdit}>
                      <X size={16} /> Cancelar
                    </button>
                  </>
                ) : (
                  <button className="rag-btn rag-btn-add" onClick={handleAddQAPair}>
                    <Plus size={16} /> Adicionar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="rag-skills">
            <h3>Capacidades do Bobby</h3>
            <p className="rag-skills-desc">
              Ligue e desligue as habilidades do assistente
            </p>
            
            <div className="rag-skills-grid">
              {Object.entries(skills).map(([key, enabled]) => (
                <div key={key} className="rag-skill-card">
                  <div className="rag-skill-header">
                    <span className="rag-skill-name">{key}</span>
                    <button 
                      className={`rag-skill-toggle ${enabled ? 'enabled' : 'disabled'}`}
                      onClick={() => handleToggleSkill(key)}
                    >
                      {enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      <span>{enabled ? 'Ativo' : 'Inativo'}</span>
                    </button>
                  </div>
                  <p className="rag-skill-desc">
                    {getSkillDescription(key)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getSkillDescription(key: string): string {
  const descriptions: Record<string, string> = {
    rag: "Busca vetorial nos documentos da base de conhecimento",
    qa: "Respostas diretas para perguntas frequentes",
    sentinela: "Firewall de entrada para filtrar conteúdo impróprio",
    vision: "Leitura e interpretação de imagens",
    proto: "Geração de protótipos e código",
    links: "Leitura e mapeamento de links da web",
  };
  return descriptions[key] || "Descrição não disponível";
}
