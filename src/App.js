import React, { useState, useEffect, useRef } from 'react';
import { Grid, Square, Trash2 } from 'lucide-react';

// Constants
const GRID_UNIT_SIZE = 42; // 42mm is the standard Gridfinity unit size
const GRID_UNIT_SIZE_IN = 1.654; // 42mm in inches
const MIN_GRID_SIZE = 1;
const MAX_GRID_SIZE = 21;

const GridfinityConfigurator = () => {
  // State
  const [units, setUnits] = useState('mm');
  const [gridWidth, setGridWidth] = useState(6);
  const [gridHeight, setGridHeight] = useState(4);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null);
  const [currentTool, setCurrentTool] = useState('draw');
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Refs
  const canvasRef = useRef(null);
  const gridRef = useRef(null);
  
  // Calculate actual dimensions based on unit selection
  const getActualDimensions = () => {
    const unitSize = units === 'mm' ? GRID_UNIT_SIZE : GRID_UNIT_SIZE_IN;
    return {
      width: (gridWidth * unitSize).toFixed(1),
      height: (gridHeight * unitSize).toFixed(1),
      unitSize
    };
  };
  
  const { width, height, unitSize } = getActualDimensions();
  
  // Calculate cell size for display
  const cellSize = 40; // display size in pixels
  const canvasWidth = gridWidth * cellSize;
  const canvasHeight = gridHeight * cellSize;
  
  // Convert screen coordinates to grid coordinates
  const screenToGrid = (x, y) => {
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);
    return { x: gridX, y: gridY };
  };
  
  // Generate a random pastel color for blocks
  const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 60%)`;
  };
  
  // Handle unit change
  const handleUnitChange = (newUnit) => {
    setUnits(newUnit);
  };
  
  // Handle grid dimension changes
  const handleGridWidthChange = (event) => {
    const value = event.target.value;
    setGridWidth(value);
  };
  
  const handleGridHeightChange = (event) => {
    const value = event.target.value;
    setGridHeight(value);
  };
  
  // Delete selected block
  const deleteSelectedBlock = () => {
    if (selectedBlockIndex !== null) {
      const newBlocks = [...blocks];
      newBlocks.splice(selectedBlockIndex, 1);
      setBlocks(newBlocks);
      setSelectedBlockIndex(null);
    }
  };
  
  // Clear all blocks
  const clearAllBlocks = () => {
    setBlocks([]);
    setSelectedBlockIndex(null);
  };
  
  // Start rotating a block
  const rotateBlock = (direction) => {
    if (selectedBlockIndex !== null) {
      const newBlocks = [...blocks];
      const block = newBlocks[selectedBlockIndex];
      
      // Calculate new rotation
      const rotationDelta = direction === 'cw' ? 90 : -90;
      let newRotation = (block.rotation || 0) + rotationDelta;
      
      // Normalize rotation to 0-359
      if (newRotation < 0) newRotation += 360;
      if (newRotation >= 360) newRotation -= 360;
      
      block.rotation = newRotation;
      setBlocks(newBlocks);
    }
  };
  
  // Handle canvas click/mousedown
  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) return;
    
    const gridPos = screenToGrid(x, y);
    
    // Check if clicking on a block first
    let clickedBlockIndex = -1;
    
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i];
      const blockLeft = block.x * cellSize;
      const blockTop = block.y * cellSize;
      const blockRight = blockLeft + block.width * cellSize;
      const blockBottom = blockTop + block.height * cellSize;
      
      if (x >= blockLeft && x <= blockRight && y >= blockTop && y <= blockBottom) {
        clickedBlockIndex = i;
        break;
      }
    }
    
    if (clickedBlockIndex !== -1) {
      // Clicked on a block
      if (currentTool === 'erase') {
        // Erase tool: Delete the block
        const newBlocks = [...blocks];
        newBlocks.splice(clickedBlockIndex, 1);
        setBlocks(newBlocks);
        setSelectedBlockIndex(null);
      } 
      else if (currentTool === 'move') {
        // Move tool: Start dragging
        const block = blocks[clickedBlockIndex];
        setDraggedBlockIndex(clickedBlockIndex);
        setDragOffset({
          x: x - (block.x * cellSize),
          y: y - (block.y * cellSize)
        });
        setSelectedBlockIndex(clickedBlockIndex);
      }
      else {
        // Select tool or other: Just select the block
        setSelectedBlockIndex(clickedBlockIndex);
      }
    } 
    else {
      // Clicked on empty space
      setSelectedBlockIndex(null);
      
      if (currentTool === 'draw') {
        // Draw tool: Start drawing a new block
        setDrawStart(gridPos);
        setDrawEnd(gridPos);
        
        // Log for debugging
        console.log("Started drawing at", gridPos);
      }
      else if (currentTool === 'erase' && blocks.length > 0) {
        // Erase tool: Start selection area for erasing multiple blocks
        setDrawStart(gridPos);
        setDrawEnd(gridPos);
      }
    }
  };
  
  // Handle mouse move
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) return;
    
    const gridPos = screenToGrid(x, y);
    
    if (draggedBlockIndex !== null) {
      // We're dragging a block - move it to the new position
      const newX = Math.floor((x - dragOffset.x) / cellSize);
      const newY = Math.floor((y - dragOffset.y) / cellSize);
      
      // Update the block position
      const newBlocks = [...blocks];
      const blockToMove = newBlocks[draggedBlockIndex];
      
      // Make sure block stays within grid bounds
      const boundedX = Math.max(0, Math.min(gridWidth - blockToMove.width, newX));
      const boundedY = Math.max(0, Math.min(gridHeight - blockToMove.height, newY));
      
      blockToMove.x = boundedX;
      blockToMove.y = boundedY;
      
      setBlocks(newBlocks);
    }
    else if (drawStart) {
      // We're drawing a selection box
      setDrawEnd(gridPos);
    }
  };
  
  // Handle mouse up
  const handleMouseUp = (e) => {
    // If we were dragging a block, stop dragging
    if (draggedBlockIndex !== null) {
      setDraggedBlockIndex(null);
      setDragOffset({ x: 0, y: 0 });
    }
    
    // If we were drawing a selection box
    if (drawStart && drawEnd) {
      if (currentTool === 'draw') {
        // Create a new block
        const startX = Math.min(drawStart.x, drawEnd.x);
        const startY = Math.min(drawStart.y, drawEnd.y);
        const width = Math.abs(drawEnd.x - drawStart.x) + 1;
        const height = Math.abs(drawEnd.y - drawStart.y) + 1;
        
        // Only create if width and height are at least 1
        if (width > 0 && height > 0) {
          const newBlock = {
            x: startX,
            y: startY,
            width,
            height,
            color: getRandomColor(),
            nickname: '',
            rotation: 0
          };
          
          // Check if the block would overlap with any existing blocks
          const wouldOverlap = blocks.some(block => {
            return !(
              block.x + block.width <= newBlock.x ||
              block.x >= newBlock.x + newBlock.width ||
              block.y + block.height <= newBlock.y ||
              block.y >= newBlock.y + newBlock.height
            );
          });
          
          if (!wouldOverlap) {
            // Add the block
            const newBlocks = [...blocks, newBlock];
            setBlocks(newBlocks);
            setSelectedBlockIndex(newBlocks.length - 1);
            
            // Log for debugging
            console.log("Created new block:", newBlock);
          }
        }
      }
      else if (currentTool === 'erase') {
        // Erase blocks in the selection area
        const startX = Math.min(drawStart.x, drawEnd.x);
        const startY = Math.min(drawStart.y, drawEnd.y);
        const endX = Math.max(drawStart.x, drawEnd.x);
        const endY = Math.max(drawStart.y, drawEnd.y);
        
        const newBlocks = blocks.filter(block => {
          // Keep blocks that don't overlap with the selection area
          return (
            block.x + block.width <= startX ||
            block.x >= endX + 1 ||
            block.y + block.height <= startY ||
            block.y >= endY + 1
          );
        });
        
        setBlocks(newBlocks);
      }
    }
    
    // Reset drawing state
    setDrawStart(null);
    setDrawEnd(null);
  };
  
  // Draw grid and selection box
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvasHeight);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvasWidth, y * cellSize);
      ctx.stroke();
    }
    
    // Draw selection box if dragging
    if (drawStart && drawEnd) {
      const startX = Math.min(drawStart.x, drawEnd.x);
      const startY = Math.min(drawStart.y, drawEnd.y);
      const width = Math.abs(drawEnd.x - drawStart.x) + 1;
      const height = Math.abs(drawEnd.y - drawStart.y) + 1;
      
      // Draw filled rectangle with transparency
      ctx.fillStyle = currentTool === 'draw' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      ctx.fillRect(
        startX * cellSize,
        startY * cellSize,
        width * cellSize,
        height * cellSize
      );
      
      // Draw border
      ctx.strokeStyle = currentTool === 'draw' ? '#3B82F6' : '#EF4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        startX * cellSize,
        startY * cellSize,
        width * cellSize,
        height * cellSize
      );
    }
  }, [gridWidth, gridHeight, cellSize, canvasWidth, canvasHeight, drawStart, drawEnd, currentTool]);
  
  // Set up event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedBlockIndex, dragOffset, drawStart, drawEnd, blocks, gridWidth, gridHeight]);
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-800">Gridfinity 2D Configurator</h2>
                <p className="text-gray-600">Design your Gridfinity layout by setting dimensions and drawing blocks</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Units</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <button 
                      className={`px-4 py-2 text-sm font-medium rounded-l-md ${units === 'mm' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                      onClick={() => handleUnitChange('mm')}
                    >
                      mm
                    </button>
                    <button 
                      className={`px-4 py-2 text-sm font-medium rounded-r-md ${units === 'in' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                      onClick={() => handleUnitChange('in')}
                    >
                      inches
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Grid Width (units)</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="number"
                    min={MIN_GRID_SIZE}
                    max={MAX_GRID_SIZE}
                    value={gridWidth}
                    onChange={handleGridWidthChange}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value < MIN_GRID_SIZE) {
                        setGridWidth(MIN_GRID_SIZE);
                      } else if (value > MAX_GRID_SIZE) {
                        setGridWidth(MAX_GRID_SIZE);
                      } else {
                        setGridWidth(value);
                      }
                    }}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Width: {width} {units}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Grid Height (units)</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="number"
                    min={MIN_GRID_SIZE}
                    max={MAX_GRID_SIZE}
                    value={gridHeight}
                    onChange={handleGridHeightChange}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (isNaN(value) || value < MIN_GRID_SIZE) {
                        setGridHeight(MIN_GRID_SIZE);
                      } else if (value > MAX_GRID_SIZE) {
                        setGridHeight(MAX_GRID_SIZE);
                      } else {
                        setGridHeight(value);
                      }
                    }}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Height: {height} {units}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md ${currentTool === 'draw' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setCurrentTool('draw')}
              >
                <Grid size={16} />
                Draw
              </button>
              <button
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md ${currentTool === 'erase' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setCurrentTool('erase')}
              >
                <Trash2 size={16} />
                Erase
              </button>
              <button
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md ${currentTool === 'select' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setCurrentTool('select')}
              >
                <Square size={16} />
                Select
              </button>
              <button
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md ${currentTool === 'move' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setCurrentTool('move')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 9l-3 3 3 3"></path>
                  <path d="M9 5l3-3 3 3"></path>
                  <path d="M15 19l3 3 3-3"></path>
                  <path d="M19 9l3 3-3 3"></path>
                  <path d="M2 12h20"></path>
                  <path d="M12 2v20"></path>
                </svg>
                Move
              </button>
              <button
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md bg-red-500 text-white ml-auto"
                onClick={clearAllBlocks}
              >
                Clear All
              </button>
            </div>
            
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Block Nickname</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    value={selectedBlockIndex !== null ? (blocks[selectedBlockIndex]?.nickname || '') : ''}
                    onChange={(e) => {
                      if (selectedBlockIndex !== null) {
                        const newBlocks = [...blocks];
                        newBlocks[selectedBlockIndex].nickname = e.target.value;
                        setBlocks(newBlocks);
                      }
                    }}
                    placeholder="Enter a nickname for this block"
                    disabled={selectedBlockIndex === null}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Block Dimensions</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={MAX_GRID_SIZE}
                    value={selectedBlockIndex !== null ? (blocks[selectedBlockIndex]?.width || 1) : 1}
                    onChange={(e) => {
                      if (selectedBlockIndex !== null) {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= MAX_GRID_SIZE) {
                          const newBlocks = [...blocks];
                          newBlocks[selectedBlockIndex].width = value;
                          setBlocks(newBlocks);
                        }
                      }
                    }}
                    disabled={selectedBlockIndex === null}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <span className="flex items-center">×</span>
                  <input
                    type="number"
                    min="1"
                    max={MAX_GRID_SIZE}
                    value={selectedBlockIndex !== null ? (blocks[selectedBlockIndex]?.height || 1) : 1}
                    onChange={(e) => {
                      if (selectedBlockIndex !== null) {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= MAX_GRID_SIZE) {
                          const newBlocks = [...blocks];
                          newBlocks[selectedBlockIndex].height = value;
                          setBlocks(newBlocks);
                        }
                      }
                    }}
                    disabled={selectedBlockIndex === null}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Block Color</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="color"
                    value={selectedBlockIndex !== null ? (blocks[selectedBlockIndex]?.color || '#3B82F6') : '#3B82F6'}
                    onChange={(e) => {
                      if (selectedBlockIndex !== null) {
                        const newBlocks = [...blocks];
                        newBlocks[selectedBlockIndex].color = e.target.value;
                        setBlocks(newBlocks);
                      }
                    }}
                    disabled={selectedBlockIndex === null}
                    className="h-10 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Block Rotation</label>
              <div className="flex items-center gap-1">
                <button
                  className="px-3 py-2 text-sm font-medium rounded-l-md bg-green-500 text-white disabled:bg-green-300"
                  onClick={() => rotateBlock('ccw')}
                  disabled={selectedBlockIndex === null}
                >
                  Rotate -90°
                </button>
                <button
                  className="px-3 py-2 text-sm font-medium rounded-r-md bg-green-500 text-white disabled:bg-green-300"
                  onClick={() => rotateBlock('cw')}
                  disabled={selectedBlockIndex === null}
                >
                  Rotate +90°
                </button>
                <button
                  className="ml-auto px-3 py-2 text-sm font-medium rounded-md bg-red-500 text-white disabled:bg-red-300"
                  onClick={deleteSelectedBlock}
                  disabled={selectedBlockIndex === null}
                >
                  Delete Selected
                </button>
              </div>
            </div>
            
            <div className="relative border border-gray-300 rounded-md overflow-hidden" style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>
              <canvas 
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                onMouseDown={handleCanvasMouseDown}
                className="absolute top-0 left-0 z-0 cursor-crosshair"
              />
              
              <div ref={gridRef} className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {blocks.map((block, index) => (
                  <div 
                    key={index}
                    style={{
                      position: 'absolute',
                      left: `${block.x * cellSize}px`,
                      top: `${block.y * cellSize}px`,
                      width: `${block.width * cellSize}px`,
                      height: `${block.height * cellSize}px`,
                      backgroundColor: block.color || '#3B82F6',
                      border: selectedBlockIndex === index ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      userSelect: 'none',
                      cursor: currentTool === 'move' ? 'grab' : 'pointer',
                      transform: block.rotation ? `rotate(${block.rotation}deg)` : 'none',
                      transformOrigin: '0 0',
                      zIndex: draggedBlockIndex === index ? 20 : 10,
                      pointerEvents: 'auto'
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      
                      if (currentTool === 'erase') {
                        // Delete the block
                        const newBlocks = [...blocks];
                        newBlocks.splice(index, 1);
                        setBlocks(newBlocks);
                        setSelectedBlockIndex(null);
                      } 
                      else if (currentTool === 'move') {
                        // Start dragging
                        const block = blocks[index];
                        setDraggedBlockIndex(index);
                        setDragOffset({
                          x: e.nativeEvent.offsetX,
                          y: e.nativeEvent.offsetY
                        });
                        setSelectedBlockIndex(index);
                      }
                      else {
                        // Select the block
                        setSelectedBlockIndex(index);
                      }
                    }}
                  >
                    <div className="text-sm">{block.nickname || "Block"}</div>
                    <div className="text-xs mt-1">{block.width}x{block.height}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="font-medium">Instructions:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Use the <b>Draw</b> tool to create new Gridfinity blocks by clicking and dragging</li>
                <li>Use the <b>Move</b> tool to drag blocks around the grid (cursor changes to a grab hand)</li>
                <li>Use the <b>Erase</b> tool to remove blocks by clicking on them</li>
                <li>Use the <b>Select</b> tool to select blocks to edit their properties</li>
                <li>You can directly enter dimensions for blocks and the grid</li>
                <li>Each grid unit is {units === 'mm' ? '42mm' : '1.65 inches'} (standard Gridfinity unit)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridfinityConfigurator;