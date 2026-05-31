'use client'
import React, { useRef, useState, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathInkModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (latex: string) => void
}

interface Point {
  x: number
  y: number
  t: number
}

interface Stroke {
  points: Point[]
}

export default function MathInkModal({ isOpen, onClose, onInsert }: MathInkModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  const [latex, setLatex] = useState('')
  const [candidates, setCandidates] = useState<string[]>([])
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [penColor, setPenColor] = useState('#38bdf8') // Neon Cyan
  const [brushSize, setBrushSize] = useState(3)
  const [isEraser, setIsEraser] = useState(false)

  // Auto-recognize timeout
  const recognizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // LaTeX post-processing mapping
  const postProcessMath = (text: string): string => {
    let math = text.trim()

    // 1. Comprehensive Unicode mathematical symbol translations
    const unicodeReplacements: { [key: string]: string } = {
      // Lowercase Greek
      'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
      'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
      'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
      'ν': '\\nu', 'ξ': '\\xi', 'ο': 'o', 'π': '\\pi', 'ρ': '\\rho',
      'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
      'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',

      // Uppercase Greek
      'Α': 'A', 'Β': 'B', 'Γ': '\\Gamma', 'Δ': '\\Delta', 'Ε': 'E',
      'Ζ': 'Z', 'Η': 'H', 'Θ': '\\Theta', 'Ι': 'I', 'Κ': 'K',
      'Λ': '\\Lambda', 'Μ': 'M', 'Ν': 'N', 'Ξ': '\\Xi', 'Ο': 'O',
      'Π': '\\Pi', 'Ρ': 'P', 'Σ': '\\Sigma', 'Τ': 'T', 'Υ': '\\Upsilon',
      'Φ': '\\Phi', 'Χ': 'X', 'Ψ': '\\Psi', 'Ω': '\\Omega',

      // Mathematical Operators & Notations
      '∑': '\\sum', '∫': '\\int', '√': '\\sqrt', '∞': '\\infty',
      '±': '\\pm', '∓': '\\mp', '×': '\\times', '·': '\\cdot',
      '÷': '\\div', '∂': '\\partial', '∇': '\\nabla', '≠': '\\neq',
      '≤': '\\le', '≥': '\\ge', '≈': '\\approx', '≡': '\\equiv',
      '∝': '\\propto', '→': '\\rightarrow', '←': '\\leftrightarrow',
      '↑': '\\uparrow', '↓': '\\downarrow', '⇒': '\\Rightarrow',
      '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow', '∀': '\\forall',
      '∃': '\\exists', '∄': '\\nexists', '∈': '\\in', '∉': '\\notin',
      '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
      '∩': '\\cap', '∪': '\\cup', '∅': '\\emptyset', '∠': '\\angle',
      '⊥': '\\perp', '′': "'", '″': "''", 'ℏ': '\\hbar',
    }

    Object.keys(unicodeReplacements).forEach(char => {
      math = math.replace(new RegExp(char, 'g'), unicodeReplacements[char]);
    });

    // 2. Comprehensive word representation replacements
    const wordReplacements: { [key: string]: string } = {
      'alpha': '\\alpha', 'beta': '\\beta', 'gamma': '\\gamma', 'delta': '\\delta',
      'epsilon': '\\epsilon', 'theta': '\\theta', 'lambda': '\\lambda', 'mu': '\\mu',
      'pi': '\\pi', 'sigma': '\\sigma', 'omega': '\\omega', 'phi': '\\phi', 'psi': '\\psi',
      'sum': '\\sum', 'int': '\\int', 'integrate': '\\int', 'integral': '\\int',
      'sqrt': '\\sqrt', 'infinity': '\\infty', 'inf': '\\infty', 'approx': '\\approx',
      'times': '\\times', 'div': '\\div', 'partial': '\\partial', 'doesnotexist': '\\nexists',
    }

    Object.keys(wordReplacements).forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      math = math.replace(regex, wordReplacements[word]);
    });

    // 3. Structures and limits parsing (Integration, Summation, Limits)
    // Limits with subscripts: lim_{x->0} or lim(x→0) or lim x->0
    math = math.replace(/lim(?:sub|[_]|\s+)?\(?([a-zA-Z0-9]+)\s*(?:->|-->|to|\\to|\\rightarrow|→)\s*([a-zA-Z0-9\\_\\+\\-]+)\)?/gi, '\\lim_{$1 \\to $2}');

    // Integrals with limits: int(a to b) or int_a^b
    math = math.replace(/(?:int|\\int)(?:[_]|\s+)?\(?([a-zA-Z0-9\-+\\infty]+)\s*(?:to|to\s+the|\\to|\^)\s*([a-zA-Z0-9\-+\\infty]+)\)?/gi, '\\int_{$1}^{$2}');

    // Summations with limits: sum(i=0 to n) or sum_i^n
    math = math.replace(/(?:sum|\\sum)(?:[_]|\s+)?\(?([a-zA-Z0-9\-+\\infty=]+)\s*(?:to|\\to|\^)\s*([a-zA-Z0-9\-+\\infty]+)\)?/gi, '\\sum_{$1}^{$2}');

    // Plain integrals & sigmas
    math = math.replace(/(?:int|∫)/g, '\\int ');
    math = math.replace(/(?:sum|∑|Sigma)/g, '\\sum ');

    // 4. Roots parsing
    math = math.replace(/(?:sqrt|\\sqrt|√)\(([^)]+)\)/gi, '\\sqrt{$1}');
    math = math.replace(/(?:sqrt|\\sqrt|√)([a-zA-Z0-9])/gi, '\\sqrt{$1}');

    // 5. Auto-typesetting of standard trigonometric and logarithmic functions
    const mathFunctions = [
      'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
      'log', 'ln', 'lg', 'lim', 'det', 'max', 'min',
      'sinh', 'cosh', 'tanh', 'arcsin', 'arccos', 'arctan'
    ];
    mathFunctions.forEach(func => {
      const regex = new RegExp(`([^\\\\]|^)\\b${func}\\b`, 'g');
      math = math.replace(regex, `$1\\${func}`);
    });

    // 6. Matrix formatting: support brackets/parentheses with rows separated by semicolons
    const parseMatrix = (match: string, content: string) => {
      if (content.includes(';')) {
        const rows = content.split(';');
        const latexRows = rows.map(row => {
          const elements = row.trim().split(/[\s,]+/);
          return elements.filter(Boolean).join(' & ');
        });
        return '\\begin{pmatrix}' + latexRows.join(' \\\\ ') + '\\end{pmatrix}';
      }
      return match;
    };
    math = math.replace(/\[([^\]]+)\]/g, parseMatrix);
    math = math.replace(/\(([^)]+)\)/g, parseMatrix);

    // 7. Strip spacing for standard LaTeX conversions
    math = math.replace(/\s+/g, '')

    // 8. Subscript / Superscript range processing
    math = math.replace(/([a-zA-Z0-9])_([0-9a-zA-Z]+)/g, '$1_{$2}')
    math = math.replace(/([a-zA-Z0-9])\^([0-9a-zA-Z+\-]+)/g, '$1^{$2}')
    math = math.replace(/\b([a-zA-Z])([0-9])\b/g, '$1^{$2}')

    // 9. Advanced Paren-Safe Fractions Parser
    const convertToFraction = (str: string): string => {
      let result = str
      let slashIndex = result.indexOf('/')
      while (slashIndex !== -1) {
        let leftBound = slashIndex - 1
        let openParens = 0
        while (leftBound >= 0) {
          const char = result[leftBound]
          if (char === ')') {
            openParens++
          } else if (char === '(') {
            openParens--
          }
          
          if (openParens === 0 && (char === '+' || char === '-' || char === '=' || char === '<' || char === '>')) {
            break
          }
          leftBound--
        }
        leftBound = Math.max(0, leftBound + 1)
        
        let rightBound = slashIndex + 1
        let closeParens = 0
        while (rightBound < result.length) {
          const char = result[rightBound]
          if (char === '(') {
            closeParens++
          } else if (char === ')') {
            closeParens--
          }
          
          if (closeParens === 0 && (char === '+' || char === '-' || char === '=' || char === '<' || char === '>')) {
            break
          }
          rightBound++
        }
        
        const leftExpr = result.substring(leftBound, slashIndex).trim()
        const rightExpr = result.substring(slashIndex + 1, rightBound).trim()
        
        let cleanLeft = leftExpr
        if (cleanLeft.startsWith('(') && cleanLeft.endsWith(')')) {
          let depth = 0
          let matching = true
          for (let i = 0; i < cleanLeft.length; i++) {
            if (cleanLeft[i] === '(') depth++
            else if (cleanLeft[i] === ')') depth--
            if (depth === 0 && i < cleanLeft.length - 1) {
              matching = false
              break
            }
          }
          if (matching) {
            cleanLeft = cleanLeft.substring(1, cleanLeft.length - 1)
          }
        }
        
        let cleanRight = rightExpr
        if (cleanRight.startsWith('(') && cleanRight.endsWith(')')) {
          let depth = 0
          let matching = true
          for (let i = 0; i < cleanRight.length; i++) {
            if (cleanRight[i] === '(') depth++
            else if (cleanRight[i] === ')') depth--
            if (depth === 0 && i < cleanRight.length - 1) {
              matching = false
              break
            }
          }
          if (matching) {
            cleanRight = cleanRight.substring(1, cleanRight.length - 1)
          }
        }

        const frac = `\\frac{${cleanLeft}}{${cleanRight}}`
        result = result.substring(0, leftBound) + frac + result.substring(rightBound)
        slashIndex = result.indexOf('/', leftBound + frac.length)
      }
      return result
    }

    math = convertToFraction(math)

    return math
  }

  // Draw on Canvas
  const drawLine = (p1: Point, p2: Point, ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = penColor
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
  }

  const redrawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw background grid lines (dark slate math theme)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Redraw all strokes
    strokes.forEach(stroke => {
      for (let i = 1; i < stroke.points.length; i++) {
        drawLine(stroke.points[i - 1], stroke.points[i], ctx)
      }
    })
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        redrawCanvas()
      }, 50)
    }
  }, [isOpen, strokes, penColor, brushSize])

  // Get Canvas mouse/touch coordinates
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 }
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
  }

  // Vector stroke eraser logic
  const eraseStrokesAt = (x: number, y: number) => {
    const nextStrokes = strokes.filter(stroke => {
      return !stroke.points.some(p => {
        const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2)
        return dist < 22 // 22px erase radius
      })
    })
    if (nextStrokes.length !== strokes.length) {
      setStrokes(nextStrokes)
      if (recognizeTimeoutRef.current) clearTimeout(recognizeTimeoutRef.current)
      recognizeTimeoutRef.current = setTimeout(() => {
        triggerRecognition(nextStrokes)
      }, 800)
    }
  }

  // Draw events
  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const { x, y } = getCoordinates(e)

    if (isEraser) {
      setIsDrawing(true)
      eraseStrokesAt(x, y)
      return
    }

    setIsDrawing(true)
    const point = { x, y, t: Date.now() }
    setCurrentStroke([point])

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = penColor
        ctx.lineWidth = brushSize
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(x, y)
      }
    }
    
    // Clear auto recognize timeout
    if (recognizeTimeoutRef.current) {
      clearTimeout(recognizeTimeoutRef.current)
    }
  }

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const { x, y } = getCoordinates(e)

    if (isEraser) {
      eraseStrokesAt(x, y)
      return
    }

    const point = { x, y, t: Date.now() }
    const prevPoint = currentStroke[currentStroke.length - 1]
    setCurrentStroke(prev => [...prev, point])

    const canvas = canvasRef.current
    if (canvas && prevPoint) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        drawLine(prevPoint, point, ctx)
      }
    }
  }

  const handleEnd = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (isEraser) {
      return
    }

    if (currentStroke.length > 0) {
      const updatedStrokes = [...strokes, { points: currentStroke }]
      setStrokes(updatedStrokes)
      
      // Setup debounced auto recognition
      if (recognizeTimeoutRef.current) clearTimeout(recognizeTimeoutRef.current)
      recognizeTimeoutRef.current = setTimeout(() => {
        triggerRecognition(updatedStrokes)
      }, 800)
    }
    setCurrentStroke([])
  }

  // Helper to identify if a horizontal division line acts as a fraction bar separating numerator and denominator strokes
  const findFractionLine = (activeStrokes: Stroke[]) => {
    if (activeStrokes.length < 3) return null

    let bestLineIndex = -1
    let maxHorizontalSpan = 0

    for (let i = 0; i < activeStrokes.length; i++) {
      const points = activeStrokes[i].points
      if (points.length < 2) continue

      const xs = points.map(p => p.x)
      const ys = points.map(p => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      const width = maxX - minX
      const height = maxY - minY

      // Horizontal line signature: wide, flat, and reasonable size
      if (width > 12 && width > height * 1.8) {
        if (width > maxHorizontalSpan) {
          maxHorizontalSpan = width
          bestLineIndex = i
        }
      }
    }

    if (bestLineIndex === -1) return null

    const lineStroke = activeStrokes[bestLineIndex]
    const lineYs = lineStroke.points.map(p => p.y)
    const lineY = lineYs.reduce((a, b) => a + b, 0) / lineYs.length

    const lineXs = lineStroke.points.map(p => p.x)
    const lineMinX = Math.min(...lineXs)
    const lineMaxX = Math.max(...lineXs)

    let aboveCount = 0
    let belowCount = 0

    const numStrokes: Stroke[] = []
    const denomStrokes: Stroke[] = []

    for (let i = 0; i < activeStrokes.length; i++) {
      if (i === bestLineIndex) continue

      const points = activeStrokes[i].points
      const ys = points.map(p => p.y)
      const avgY = ys.reduce((a, b) => a + b, 0) / ys.length

      const xs = points.map(p => p.x)
      const avgX = xs.reduce((a, b) => a + b, 0) / xs.length

      const tolerance = 100
      if (avgX >= lineMinX - tolerance && avgX <= lineMaxX + tolerance) {
        if (avgY < lineY) {
          aboveCount++
          numStrokes.push(activeStrokes[i])
        } else {
          belowCount++
          denomStrokes.push(activeStrokes[i])
        }
      }
    }

    if (aboveCount > 0 && belowCount > 0) {
      return {
        lineIndex: bestLineIndex,
        numStrokes,
        denomStrokes,
      }
    }

    return null
  }

  // Helper to recognize a subset of strokes
  const recognizeStrokes = async (targetStrokes: Stroke[], canvasWidth: number, canvasHeight: number): Promise<string[]> => {
    if (targetStrokes.length === 0) return []
    const inkData = targetStrokes.map(stroke => [
      stroke.points.map(p => Math.round(p.x)),
      stroke.points.map(p => Math.round(p.y)),
      stroke.points.map(p => p.t - stroke.points[0].t),
    ])

    try {
      const response = await fetch('https://inputtools.google.com/request?ime=handwriting&app=translate&dbg=1&cs=1&oe=UTF-8', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          options: 'enable_pre_space',
          requests: [
            {
              writing_guide: {
                writing_area_width: canvasWidth,
                writing_area_height: canvasHeight,
              },
              pre_context: '',
              max_num_results: 5,
              max_completions: 0,
              language: 'en',
              ink: inkData,
            },
          ],
        }),
      })

      const data = await response.json()
      if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
        return data[1][0][1] as string[]
      }
    } catch (e) {
      console.error('Sub-strokes recognition failed:', e)
    }
    return []
  }

  // Recognize logic using Google Input Tools Handwriting API
  const triggerRecognition = async (activeStrokes: Stroke[] = strokes) => {
    if (activeStrokes.length === 0) {
      setLatex('')
      return
    }

    setIsRecognizing(true)

    const canvas = canvasRef.current
    const width = canvas ? canvas.width : 600
    const height = canvas ? canvas.height : 300

    try {
      const baselineCandidatesPromise = recognizeStrokes(activeStrokes, width, height)

      const fracInfo = findFractionLine(activeStrokes)
      let fracCandidates: string[] = []

      if (fracInfo) {
        const [numCands, denomCands] = await Promise.all([
          recognizeStrokes(fracInfo.numStrokes, width, height),
          recognizeStrokes(fracInfo.denomStrokes, width, height)
        ])

        if (numCands.length > 0 && denomCands.length > 0) {
          const topNum = numCands.slice(0, 3).map(n => postProcessMath(n))
          const topDenom = denomCands.slice(0, 3).map(d => postProcessMath(d))

          topNum.forEach(n => {
            topDenom.forEach(d => {
              fracCandidates.push(`\\frac{${n}}{${d}}`)
            })
          })
        }
      }

      const baselineCandidates = await baselineCandidatesPromise
      const processedBaseline = baselineCandidates.map(c => postProcessMath(c))

      const combined = [...fracCandidates, ...processedBaseline]
      const unique = Array.from(new Set(combined))
      setCandidates(unique)

      if (unique.length > 0) {
        setLatex(unique[0])
      }
    } catch (e) {
      console.error('Handwriting Recognition failed:', e)
    } finally {
      setIsRecognizing(false)
    }
  }

  // Undo last stroke
  const handleUndo = () => {
    const nextStrokes = strokes.slice(0, -1)
    setStrokes(nextStrokes)
    if (recognizeTimeoutRef.current) clearTimeout(recognizeTimeoutRef.current)
    triggerRecognition(nextStrokes)
  }

  // Clear drawing board
  const handleClear = () => {
    setStrokes([])
    setCurrentStroke([])
    setLatex('')
    setCandidates([])
    if (recognizeTimeoutRef.current) clearTimeout(recognizeTimeoutRef.current)
  }

  // Copy LaTeX code to clipboard
  const handleCopy = () => {
    if (!latex) return
    navigator.clipboard.writeText(latex)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Done & insert formula inside Editor
  const handleInsert = () => {
    const trimmed = latex.trim()
    if (!trimmed) return
    const wrapped = (trimmed.startsWith('$') && trimmed.endsWith('$'))
      ? trimmed
      : `$ ${trimmed} $`
    onInsert(wrapped)
    onClose()
    handleClear()
  }

  if (!isOpen) return null

  // Render LaTeX via KaTeX
  let katexHTML = ''
  if (latex.trim()) {
    try {
      katexHTML = katex.renderToString(latex, { displayMode: true, throwOnError: false })
    } catch (e) {
      katexHTML = `<span class="text-rose-500 text-sm">Invalid LaTeX formula formatting</span>`
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✍️</span>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">Formula Ink Pad</h3>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Doodle mathematical equations naturally</p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); handleClear() }}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Board & Canvas */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          
          <div className="flex flex-wrap justify-between items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
            {/* Draw vs Erase Mode */}
            <div className="flex bg-slate-950 border border-white/10 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setIsEraser(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !isEraser
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                ✏️ Draw
              </button>
              <button
                type="button"
                onClick={() => setIsEraser(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isEraser
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                🧽 Erase
              </button>
            </div>

            {/* Color Select */}
            <div className={`flex items-center gap-2 transition-opacity duration-200 ${isEraser ? 'opacity-30 pointer-events-none' : ''}`}>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pen Color:</span>
              <div className="flex gap-1.5">
                {['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPenColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${penColor === color ? 'scale-125 border-white shadow-lg' : 'border-transparent hover:scale-110'}`}
                  />
                ))}
              </div>
            </div>

            {/* Thickness */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {isEraser ? 'Eraser Size:' : 'Thickness:'}
              </span>
              <input
                type="range"
                min="2"
                max="12"
                value={brushSize}
                onChange={e => setBrushSize(Number(e.target.value))}
                className="w-24 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-300 w-4">{brushSize}px</span>
            </div>
          </div>

          {/* Doodling Canvas Box */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950/70 shadow-inner group">
            <canvas
              ref={canvasRef}
              width={600}
              height={260}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              className={`w-full block touch-none ${isEraser ? 'cursor-cell' : 'cursor-crosshair'}`}
            />
            {isRecognizing && (
              <div className="absolute top-4 right-4 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                Recognizing Math...
              </div>
            )}
            
            {/* Draw Help Hint */}
            {strokes.length === 0 && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center flex-col text-gray-500 select-none space-y-2">
                <span className="text-3xl opacity-30">✍️</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-40">Write formula in this space</span>
                <span className="text-[10px] opacity-30">e.g. x^2 + y^2 = z^2</span>
              </div>
            )}
          </div>

          {/* Canvas Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-white/5 bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              ↩️ Undo
            </button>
            <button
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-white/5 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              🗑️ Clear
            </button>
            <button
              onClick={() => triggerRecognition()}
              disabled={strokes.length === 0 || isRecognizing}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              🔄 Recognize
            </button>
          </div>

          {/* KaTeX Live Rendering */}
          <div className="space-y-2 pt-4 border-t border-white/5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Equation Preview</label>
            <div className="w-full min-h-[90px] rounded-2xl border border-white/15 bg-white/5 p-5 flex items-center justify-center overflow-x-auto shadow-inner math-preview-container">
              <style>{`
                .math-preview-container,
                .math-preview-container *,
                .math-preview-container .katex,
                .math-preview-container .katex * {
                  color: #ffffff !important;
                  fill: #ffffff !important;
                  stroke: #ffffff !important;
                }
              `}</style>
              {latex.trim() ? (
                <div 
                  className="text-white text-xl text-center leading-relaxed select-all"
                  dangerouslySetInnerHTML={{ __html: katexHTML }}
                />
              ) : (
                <span className="text-gray-500 italic text-sm">Preview of recognized formula will render here</span>
              )}
            </div>
          </div>

          {/* LaTeX Formula Output Panel */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Formula LaTeX String</label>
              {latex && (
                <button
                  onClick={handleCopy}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5"
                >
                  {copied ? '✅ Copied!' : '📋 Copy LaTeX'}
                </button>
              )}
            </div>

            {/* Alternative Matches / Candidates */}
            {candidates.length > 1 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Alternative Matches (Click to select)</span>
                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto p-1 bg-white/5 rounded-xl border border-white/5">
                  {candidates.map((cand, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLatex(cand)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono border transition-all ${
                        latex === cand
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-md scale-[1.02]'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
                      }`}
                    >
                      {cand}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <textarea
              value={latex}
              onChange={e => setLatex(e.target.value)}
              rows={2}
              placeholder="LaTeX representation will appear here automatically..."
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-indigo-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-white/5 flex gap-4 justify-end">
          <button
            onClick={() => { onClose(); handleClear() }}
            className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-sm font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!latex.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            📥 Insert Into Cell
          </button>
        </div>
      </div>
    </div>
  )
}
