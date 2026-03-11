import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { audioService } from './lib/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle, Loader2, Pencil, X, Check } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Timestamp;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Firebase 설정 확인
  const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      const localTodos = localStorage.getItem('todos');
      if (localTodos) {
        setTodos(JSON.parse(localTodos));
      }
      setIsLocalMode(true);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'todos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const todosData: Todo[] = [];
      querySnapshot.forEach((doc) => {
        todosData.push({ id: doc.id, ...doc.data() } as Todo);
      });
      setTodos(todosData);
      setLoading(false);
      setIsLocalMode(false);
      setError(null);
    }, (err) => {
      console.error("Firestore error:", err);
      if (err.message.includes('permission')) {
        setError("Firestore 보안 규칙 설정이 필요합니다. 아래 '해결 방법'을 확인해주세요.");
      } else {
        setError("Firebase 연결에 실패했습니다. 로컬 모드로 전환합니다.");
      }
      setIsLocalMode(true);
      const localTodos = localStorage.getItem('todos');
      if (localTodos) setTodos(JSON.parse(localTodos));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isFirebaseConfigured]);

  // 로컬 모드일 때 저장
  useEffect(() => {
    if (isLocalMode) {
      localStorage.setItem('todos', JSON.stringify(todos));
    }
  }, [todos, isLocalMode]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newTodo = {
      text: inputValue,
      completed: false,
      createdAt: Timestamp.now(),
    };

    if (isLocalMode) {
      const localTodo = { ...newTodo, id: Date.now().toString() };
      setTodos([localTodo as Todo, ...todos]);
      setInputValue('');
      audioService.playClick();
      return;
    }

    try {
      await addDoc(collection(db, 'todos'), newTodo);
      setInputValue('');
      audioService.playClick();
    } catch (err) {
      console.error("Error adding todo:", err);
      setError("할 일을 추가하는 중 오류가 발생했습니다. 로컬에 저장합니다.");
      setIsLocalMode(true);
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    if (isLocalMode) {
      setTodos(todos.map(t => t.id === id ? { ...t, completed: !completed } : t));
      if (!completed) audioService.playSuccess();
      else audioService.playClick();
      return;
    }

    try {
      const todoRef = doc(db, 'todos', id);
      await updateDoc(todoRef, {
        completed: !completed,
      });
      if (!completed) {
        audioService.playSuccess();
      } else {
        audioService.playClick();
      }
    } catch (err) {
      console.error("Error toggling todo:", err);
    }
  };

  const deleteTodo = async (id: string) => {
    if (isLocalMode) {
      setTodos(todos.filter(t => t.id !== id));
      audioService.playClick();
      return;
    }

    try {
      await deleteDoc(doc(db, 'todos', id));
      audioService.playClick();
    } catch (err) {
      console.error("Error deleting todo:", err);
      setError("삭제에 실패했습니다.");
    }
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingText(todo.text);
    audioService.playClick();
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
    audioService.playClick();
  };

  const saveEdit = async (id: string) => {
    if (!editingText.trim()) return;

    if (isLocalMode) {
      setTodos(todos.map(t => t.id === id ? { ...t, text: editingText } : t));
      setEditingId(null);
      setEditingText('');
      audioService.playSuccess();
      return;
    }

    try {
      const todoRef = doc(db, 'todos', id);
      await updateDoc(todoRef, {
        text: editingText,
      });
      setEditingId(null);
      setEditingText('');
      audioService.playSuccess();
    } catch (err) {
      console.error("Error updating todo text:", err);
      setError("수정에 실패했습니다.");
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-200">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-amber-50 rounded-full">
              <AlertCircle className="w-12 h-12 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">Firebase 설정 필요</h1>
            <p className="text-stone-600 leading-relaxed">
              앱을 사용하기 위해 Firebase 설정이 필요합니다.<br/>
              <code className="bg-stone-100 px-2 py-1 rounded text-sm mt-2 block">.env.example</code> 파일을 참고하여 환경 변수를 설정해주세요.
            </p>
            <div className="w-full pt-4 text-left text-sm text-stone-500 space-y-2">
              <p>1. Firebase Console에서 프로젝트 생성</p>
              <p>2. Firestore Database 활성화</p>
              <p>3. 웹 앱 추가 후 구성 정보 복사</p>
              <p>4. AI Studio 설정 메뉴에서 환경 변수 입력</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 font-sans selection:bg-emerald-100">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-stone-900 tracking-tight mb-2"
          >
            마음챙김 할 일
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-stone-500 font-medium"
          >
            오늘의 집중을 위한 작은 발걸음
          </motion.p>
        </header>

        {/* Input Form */}
        <form onSubmit={addTodo} className="mb-8 relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="어떤 일을 시작해볼까요?"
            className="w-full bg-white border-2 border-stone-200 rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:border-emerald-400 transition-all shadow-sm text-stone-800 placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="absolute right-2 top-2 bottom-2 bg-emerald-500 text-white px-4 rounded-xl hover:bg-emerald-600 disabled:bg-stone-200 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100 shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
            
            {error.includes('보안 규칙') && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white rounded-2xl border border-stone-200 shadow-lg space-y-4"
              >
                <h3 className="font-bold text-stone-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Firestore 보안 규칙 해결 방법
                </h3>
                <div className="text-sm text-stone-600 space-y-3">
                  <p>1. <a href="https://console.firebase.google.com/" target="_blank" className="text-emerald-600 underline font-medium">Firebase Console</a> 접속</p>
                  <p>2. <strong>Build &gt; Firestore Database &gt; Rules</strong> 탭 이동</p>
                  <p>3. 아래 코드를 복사하여 붙여넣고 <strong>Publish(게시)</strong> 클릭:</p>
                  <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-xs overflow-x-auto leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /todos/{todoId} {
      allow read, write: if true;
    }
  }
}`}
                  </pre>
                  <p className="text-xs text-stone-400 italic">* 게시 후 반영까지 최대 1분이 소요될 수 있습니다.</p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Todo List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p>데이터를 가져오는 중...</p>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-stone-200">
              <p className="text-stone-400 font-medium">할 일이 없습니다. 새로운 시작을 해보세요!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {todos.map((todo) => (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: -20 }}
                  className={`group flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all ${
                    todo.completed ? 'opacity-60' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className={`flex-shrink-0 transition-colors ${
                      todo.completed ? 'text-emerald-500' : 'text-stone-300 hover:text-stone-400'
                    }`}
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : (
                      <Circle className="w-7 h-7" />
                    )}
                  </button>
                  
                  {editingId === todo.id ? (
                    <div className="flex-grow flex items-center gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(todo.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        className="flex-grow bg-stone-50 border border-emerald-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-stone-800"
                      />
                      <button onClick={() => saveEdit(todo.id)} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={cancelEditing} className="p-1 text-stone-400 hover:bg-stone-100 rounded">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={`flex-grow text-lg font-medium transition-all ${
                        todo.completed ? 'text-stone-400 line-through' : 'text-stone-800'
                      }`}>
                        {todo.text}
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => startEditing(todo)}
                          className="p-2 text-stone-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="p-2 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Progress Footer */}
        {!loading && todos.length > 0 && (
          <motion.footer 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 pt-8 border-t border-stone-200 flex justify-between items-center text-sm text-stone-500 font-medium"
          >
            <div>
              전체 {todos.length}개 중 {todos.filter(t => t.completed).length}개 완료
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full ${
                    i < Math.floor((todos.filter(t => t.completed).length / todos.length) * 5) 
                      ? 'bg-emerald-400' 
                      : 'bg-stone-200'
                  }`}
                />
              ))}
            </div>
          </motion.footer>
        )}
      </div>
    </div>
  );
}
