# Visual Flow Builder - Final Implementation Planning

## Project Structure

### Top-level Setup

```
.
├── .env.local.example           # API base URLs, mock tokens
├── next.config.mjs              # React-strict, SWC plugins
├── tailwind.config.ts           # colour palette, plugins
├── postcss.config.mjs           # tailwind + autoprefixer
├── tsconfig.json                # @/cb/* path alias
└── pnpm-workspace.yaml          # optional, if you later monorepo

```

### Source Architecture

```
src/
├─ app/                          # Next.js App Router
│   ├─ layout.tsx                # Root layout (Providers, Tailwind globals)
│   ├─ page.tsx                  # Landing (redirects to /flows/new)
│   │
│   ├─ flows/                    # Flow builder namespace
│   │   ├─ [id]/                 # Builder for existing flow
│   │   │   ├─ builder/          # Visual builder route
│   │   │   │   ├─ page.tsx      # <FlowCanvas/> shell
│   │   │   │   └─ loading.tsx   # Skeleton while registry lazy-loads
│   │   │   ├─ page.tsx          # Flow overview
│   │   │   └─ route.ts          # RESTful GET/PUT for flow data
│   │   │
│   │   └─ new/                  # Create-new shortcut
│   │       └─ page.tsx          # Creates draft → redirects to builder
│   │
│   └─ api/                      # API endpoints
│       └─ flows/                # Flow data endpoints
│           └─ [id]/route.ts     # Flow CRUD operations
│
├─ campaign-builder/             # Visual flow builder library
│   ├─ registry/                 # Node type registry with prerequisites
│   ├─ store/                    # Zustand state management
│   ├─ layout/                   # Canvas layout components
│   ├─ nodes/                    # Node type components
│   ├─ components/               # Shared UI components (+ buttons, edges)
│   ├─ panels/                   # Configuration panels
│   ├─ validators/               # Input validation
│   ├─ hooks/                    # Custom React hooks
│   ├─ utils/                    # Utility functions
│   └─ types/                    # TypeScript definitions
│
└─ lib/
    ├─ db.ts                     # Database abstraction
    ├─ auth.ts                   # Authentication
    └─ env.ts                    # Environment variables

```

## Data Structure for Backend Integration

### Flow Data Structure

Flow data structured as nodes and edges arrays with timestamp:

- **nodes array**: All node objects with configuration and positioning
- **edges array**: Clean connection objects between nodes
- **timestamp**: Last modified timestamp for versioning

### Node Data Schema

Each node structure:

- **id**: Unique identifier with timestamp
- **type**: Node category (action, condition)
- **position**: x, y coordinates for canvas placement
- **data**: Complete node configuration and properties
- **measured**: width, height for rendering
- **selected**: Selection state for UI

### Edge Data Schema

Clean edge connections:

- **id**: Unique connection identifier
- **source**: Source node id
- **target**: Target node id
- **type**: Edge category (normal, conditional)
- **animated**: Visual animation state
- **data**: Minimal edge properties

### Delay Storage Flexibility

Delays can be stored in either location:

- **Node delays**: Within node data.config for node-specific timing
- **Edge delays**: Within edge data for connection-specific timing
- **Visual display**: Always shown on nodes regardless of storage location

## Node Types Implementation

### Action Steps Nodes

- Visit Profile
- Follow Profile
- Follow company
- Endorse Skills
- Like post
- Comment on Post
- Send invite (Connection Request)
- Send message
- Withdraw request
- Send Email
- Send WhatsApp
- Integration Steps (Zapier, HubSpot, etc.)

### Condition Steps Nodes

- Is Linkedin Request Accepted?
- Is Replied on Linkedin?
- Is Replied on Email?
- Is Email Opened?
- Is Link in the Email Opened?
- Is response positive or negative?


## Interactive Plus Button System

### Plus Button Implementation

- **Node End Plus**: Plus buttons at output connection points
- **Edge Plus**: Plus buttons at midpoints of existing connections
- **Branch Plus**: Separate plus for Yes/No condition branches

### Plus Button Behavior

- **Click Plus**: Opens filtered node palette based on context
- **Node Addition**: Automatically connects new node to flow
- **Edge Insertion**: Inserts node between existing connections
- **Context Filtering**: Shows only valid nodes for current position

### Dynamic Node Palette

- **Context Awareness**: Filter nodes based on current flow position
- **Prerequisites Check**: Validate upstream requirements
- **Branch Context**: Different options for Yes vs No branches
- **Visual Feedback**: Gray out unavailable nodes with explanations

## Visual Flow Features

### Delay System Implementation

- **Visual Display**: All delays shown within node UI
- **Storage Flexibility**: Backend can store delays in nodes or edges
- **Delay Types**: Fixed duration or conditional timing
- **Time Units**: Minutes, hours, days, weeks
- **Conditional Delays**: "within" timeframe vs "wait until" condition

### Conditional Branching

- **Binary Conditions**: Yes/No, True/False branching
- **Path Separation**: Independent flow paths from conditions
- **Merge Points**: Branches can reconverge at designated nodes
- **Visual Distinction**: Green Yes paths, Red No paths
- **Branch Context**: Track current branch for node filtering

### A/B Testing Implementation

- **Version Container**: Single node with multiple internal versions
- **Version Management**: Version A and Version B configurations
- **Split Control**: Traffic distribution percentage
- **Visual Layout**: Stacked versions within node UI
- **Unified Connections**: Single input/output despite internal versions

## Prerequisites and Context System

### Node Registry Rules

- **Sequential Dependencies**: Nodes requiring specific predecessors
- **Branch Context**: Available nodes based on current path
- **Platform Requirements**: Integration-specific prerequisites
- **Validation Rules**: Prevent invalid node combinations

### Dynamic Filtering Logic

- **Path Analysis**: Examine upstream nodes for available options
- **Context Switching**: Update palette when changing branches
- **Smart Suggestions**: Recommend logical next steps
- **Error Prevention**: Block invalid operations with clear feedback

## Component Architecture Planning

### Core Canvas Components

- **FlowCanvas**: Main canvas with viewport and interaction management
- **NodeRenderer**: Dynamic rendering of all node types
- **EdgeRenderer**: Connection visualization with animations
- **PlusButtonLayer**: Overlay for all plus button interactions
- **ConfigurationPanel**: Context-sensitive node configuration

### Node System Components

- **BaseNode**: Shared functionality across node types
- **ActionNode**: Executable workflow steps
- **ConditionNode**: Decision points with branching outputs

- **ABTestNode**: Version container with split testing

### Interactive Components

- **FloatingPlus**: Canvas-level plus button component
- **EdgePlus**: Midpoint plus button on connections
- **NodePlus**: Output connection plus buttons
- **NodePalette**: Filtered node selection interface
- **DelayIndicator**: Visual delay display component

## Phase-by-Phase Implementation Plan

### Phase 1: Foundation Canvas (Week 1-2)

**Core Infrastructure**

- Set up Next.js project with complete folder structure
- Implement canvas viewport with smooth pan/zoom
- Create Zustand store for flow data management
- Build basic node registry system
- Implement node positioning and selection

**Key Deliverables:**

- Working canvas with 60fps pan/zoom
- Basic node rendering and positioning
- Store integration for flow persistence
- Node selection with visual feedback

### Phase 2: Node System Foundation (Week 3-4)

**Node Implementation**

- Build base node component architecture
- Create action node variants for all types
- Implement condition node with branch visualization
- Add node configuration system
- Build delay indicator component

**Key Deliverables:**

- All node types rendering correctly
- Basic node configuration interface
- Delay display within nodes
- Node highlighting and selection

### Phase 3: Connection System (Week 5-6)

**Edge and Flow Logic**

- Implement edge rendering between nodes
- Create conditional edge types
- Build automatic routing and collision detection
- Add edge selection and manipulation
- Implement branch path management

**Key Deliverables:**

- Complete edge connection system
- Conditional branching visualization
- Yes/No path differentiation
- Edge selection and interaction

### Phase 4: Plus Button System (Week 7-8)

**Interactive Node Addition**

- Create edge midpoint plus buttons
- Build node output plus buttons
- Add context-aware node palette
- Implement click-to-add workflow

**Key Deliverables:**

- Complete plus button system
- Dynamic node addition anywhere
- Edge insertion capability
- Context-filtered node palette

### Phase 5: Prerequisites and Context (Week 9-10)

**Smart Flow Management**

- Build prerequisite validation system
- Implement dynamic node filtering
- Create path analysis for context awareness
- Add visual feedback for restrictions
- Build flow validation system

**Key Deliverables:**

- Context-aware node filtering
- Prerequisite validation
- Branch-specific node availability
- Clear user feedback system

### Phase 6: Advanced Node Features (Week 11-12)

**Enhanced Functionality**

- Implement A/B testing node versions
- Add complex configuration panels
- Build integration-specific nodes
- Create advanced delay configurations
- Add node status indicators

**Key Deliverables:**

- A/B testing functionality
- Complex node configurations
- Integration node support
- Advanced timing options

### Phase 7: Flow Management (Week 13-14)

**Complete Flow Operations**

- Implement flow save/load functionality
- Add undo/redo system
- Create flow validation
- Build import/export capabilities
- Add flow versioning support

**Key Deliverables:**

- Complete flow persistence
- History management
- Flow validation system
- Import/export functionality

### Phase 8: Polish and Optimization (Week 15-16)

**Production Readiness**

- Add smooth animations and transitions
- Implement keyboard shortcuts
- Optimize performance for large flows
- Create responsive design
- Add comprehensive error handling

**Key Deliverables:**

- Polished animations
- Performance optimization
- Mobile responsiveness
- Production-ready stability

## Success Criteria and Validation

### Functional Requirements

- Support all node types with full configuration
- Plus button system working in all contexts
- Prerequisite-based filtering functional
- Conditional branching with proper separation
- A/B testing within single nodes
- Flexible delay storage and display

### Performance Requirements

- Handle 100+ node flows smoothly
- Canvas operations under 16ms response
- Auto-save every 30 seconds
- Fast flow loading under 2 seconds
- Efficient memory usage for large flows

### User Experience Requirements

- Intuitive plus button interactions
- Clear visual feedback for all operations
- Context-sensitive help system
- Keyboard accessibility
- Mobile-friendly interface

### Technical Requirements

- Clean separation between storage and display
- Flexible backend integration
- Extensible node system
- Robust error handling
- Production-ready performance

This plan provides a comprehensive roadmap for building a sophisticated visual flow builder that eliminates older placeholder approaches in favor of dynamic plus button interactions while maintaining flexibility for delay storage and ensuring seamless backend integration.