class FamilyTreeApp {
    constructor() {
        this.familyData = [];
        this.scale = 1;
        this.translateX = 50;
        this.translateY = 50;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.cardWidth = 280;
        this.cardHeight = 280;
        this.layoutMode = localStorage.getItem('layoutMode') || 'normal';
        this.setLayoutSpacing();
        this.expandedCardId = null;
        this.init();
    }

    setLayoutSpacing() {
        const layouts = {
            compact: { h: 180, v: 200 },
            normal: { h: 250, v: 250 },
            wide: { h: 350, v: 250 },
            extrawide: { h: 500, v: 250 },
            vertical: { h: 200, v: 350 }
        };
        const spacing = layouts[this.layoutMode] || layouts.normal;
        this.horizontalGap = spacing.h;
        this.verticalGap = spacing.v;
    }

    init() {
        const saved = localStorage.getItem('familyTreeData');
        if (saved) {
            this.familyData = JSON.parse(saved);
        } else {
            this.familyData = [{
                id: this.generateId(),
                name: 'Root Ancestor',
                birth: '',
                death: '',
                gender: 'male',
                image: '',
                notes: '',
                relationship: '',
                children: []
            }];
        }
        this.setupEventListeners();
        this.render();
        this.updateStatistics();
    }

    generateId() {
        return 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    setupEventListeners() {
        const container = document.getElementById('canvasContainer');
        const canvas = document.getElementById('treeCanvas');

        container.addEventListener('mousedown', (e) => {
            if (e.target === container || e.target === canvas || e.target.tagName === 'svg') {
                this.isDragging = true;
                this.startX = e.clientX - this.translateX;
                this.startY = e.clientY - this.translateY;
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.translateX = e.clientX - this.startX;
                this.translateY = e.clientY - this.startY;
                this.updateTransform();
            }
        });

        container.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        container.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= delta;
            this.scale = Math.max(0.1, Math.min(3, this.scale));
            this.updateTransform();
        });

        document.getElementById('searchBox').addEventListener('input', (e) => {
            this.searchPerson(e.target.value);
        });
    }

    updateTransform() {
        const canvas = document.getElementById('treeCanvas');
        canvas.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }

    render() {
        const cardsContainer = document.getElementById('cardsContainer');
        cardsContainer.innerHTML = '';
        this.calculatePositions(this.familyData, 0, 0);
        this.renderGenerationLabels();
        this.renderPerson(this.familyData[0], null, 0);
        this.drawConnections();
        this.updateTransform();
    }

    calculatePositions(persons, level, siblingIndex, parentX = null) {
        // Calculate subtree width for each person first
        persons.forEach(person => {
            person.subtreeWidth = this.getSubtreeWidth(person);
        });

        let currentX = 0;
        persons.forEach((person, index) => {
            if (level === 0) {
                // Center root
                person.x = 500;
                person.y = 100;
            } else {
                if (parentX !== null) {
                    const totalSiblings = persons.length;
                    
                    // Calculate total width needed for all siblings
                    let totalWidth = 0;
                    persons.forEach(p => {
                        totalWidth += p.subtreeWidth;
                    });
                    
                    // Position based on subtree width
                    if (index === 0) {
                        currentX = parentX - totalWidth / 2;
                    }
                    
                    person.x = currentX + person.subtreeWidth / 2;
                    currentX += person.subtreeWidth;
                } else {
                    person.x = currentX;
                    currentX += person.subtreeWidth;
                }
                person.y = level * this.verticalGap + 100;
            }
            
            if (person.children && person.children.length > 0) {
                this.calculatePositions(person.children, level + 1, 0, person.x);
            }
        });
    }

    getSubtreeWidth(person) {
        if (!person.children || person.children.length === 0) {
            return this.horizontalGap;
        }
        
        let totalWidth = 0;
        person.children.forEach(child => {
            totalWidth += this.getSubtreeWidth(child);
        });
        
        return Math.max(totalWidth, this.horizontalGap);
    }

    renderGenerationLabels() {
        const maxLevel = this.getMaxLevel(this.familyData, 0);
        for (let i = 0; i <= maxLevel; i++) {
            const label = document.createElement('div');
            label.className = 'generation-label';
            label.textContent = `Gen ${i + 1}`;
            label.style.top = (i * (this.cardHeight + this.verticalGap) + 50) + 'px';
            document.getElementById('cardsContainer').appendChild(label);
        }
    }

    getMaxLevel(persons, level) {
        let maxLevel = level;
        persons.forEach(person => {
            if (person.children && person.children.length > 0) {
                const childMaxLevel = this.getMaxLevel(person.children, level + 1);
                maxLevel = Math.max(maxLevel, childMaxLevel);
            }
        });
        return maxLevel;
    }

    calculateAge(birth, death) {
        if (!birth) return null;
        let birthYear;
        if (birth.length === 4 && !isNaN(birth)) {
            birthYear = parseInt(birth);
        } else {
            const d = new Date(birth);
            if (isNaN(d.getTime())) return null;
            birthYear = d.getFullYear();
        }
        let endYear;
        if (death) {
            if (death.length === 4 && !isNaN(death)) {
                endYear = parseInt(death);
            } else {
                const d = new Date(death);
                if (isNaN(d.getTime())) return null;
                endYear = d.getFullYear();
            }
        } else {
            endYear = new Date().getFullYear();
        }
        const age = endYear - birthYear;
        return age > 0 ? age : null;
    }

    renderPerson(person, parentId, generation) {
        const card = document.createElement('div');
        const isExpanded = person.id === this.expandedCardId;
        
        if (isExpanded) {
            // Expanded card view with all fields
            card.className = `person-card-expanded ${person.gender} ${person.death ? 'deceased' : 'living'}`;
            card.style.left = person.x + 'px';
            card.style.top = person.y + 'px';
            card.id = 'card_' + person.id;

            const initials = person.name.split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2) || '??';
            const age = this.calculateAge(person.birth, person.death);
            const ageDisplay = age ? `<div class="age-display">${person.death ? '✝' : '🎂'} ${age}y</div>` : '';

            card.innerHTML = `
                <button class="close-card-btn" onclick="app.collapseCard()">✕</button>
                <div class="card-header">
                    <div class="avatar-container">
                        ${person.image ? `<img src="${person.image}" class="avatar">` : `<div class="avatar-placeholder">${initials}</div>`}
                        <button class="upload-btn" onclick="event.stopPropagation();app.uploadImage('${person.id}')">📷</button>
                        <input type="file" id="file_${person.id}" accept="image/*" onchange="app.handleImageUpload('${person.id}',event)">
                    </div>
                    <div class="card-info">
                        <input type="text" class="editable name-input" value="${person.name}" onchange="app.updatePerson('${person.id}','name',this.value)" placeholder="Name">
                        <select class="gender-select" onchange="app.updatePerson('${person.id}','gender',this.value)">
                            <option value="male" ${person.gender === 'male' ? 'selected' : ''}>👨 Male</option>
                            <option value="female" ${person.gender === 'female' ? 'selected' : ''}>👩 Female</option>
                        </select>
                        <span class="status-indicator ${person.death ? 'status-deceased' : 'status-living'}"></span>
                        ${ageDisplay}
                    </div>
                </div>
                <input type="text" class="editable date-input" placeholder="Birth: YYYY or YYYY-MM-DD" value="${person.birth}" onchange="app.updatePerson('${person.id}','birth',this.value)">
                <input type="text" class="editable date-input" placeholder="Death: YYYY or YYYY-MM-DD" value="${person.death}" onchange="app.updatePerson('${person.id}','death',this.value)">
                <div class="notes-section">
                    <textarea class="editable notes-input" placeholder="Notes..." onchange="app.updatePerson('${person.id}','notes',this.value)">${person.notes}</textarea>
                </div>
                <div class="card-actions">
                    <button class="card-btn add-child-btn" onclick="app.addChild('${person.id}')">➕ Add</button>
                    <button class="card-btn delete-btn" onclick="app.deletePerson('${person.id}')">🗑️ Delete</button>
                </div>
            `;
        } else {
            // Collapsed circle view
            card.className = `person-card ${person.gender} ${person.death ? 'deceased' : 'living'}`;
            card.style.left = person.x + 'px';
            card.style.top = person.y + 'px';
            card.id = 'card_' + person.id;

            const initials = person.name.split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2) || '??';

            card.innerHTML = `
                <div class="avatar-container" style="width:120px;height:120px;margin:0 auto;">
                    ${person.image ? `<img src="${person.image}" class="avatar" style="width:120px;height:120px;">` : `<div class="avatar-placeholder" style="width:120px;height:120px;font-size:48px;">${initials}</div>`}
                    <button class="upload-btn" onclick="event.stopPropagation();app.uploadImage('${person.id}')">📷</button>
                    <input type="file" id="file_${person.id}" accept="image/*" onchange="app.handleImageUpload('${person.id}',event)">
                </div>
                <button class="delete-circle-btn" onclick="event.stopPropagation();app.deletePerson('${person.id}')">🗑️</button>
                <button class="add-card-below" onclick="event.stopPropagation();app.addChild('${person.id}')">➕</button>
            `;
            
            card.onclick = (e) => {
                if (!e.target.classList.contains('add-card-below') && 
                    !e.target.classList.contains('upload-btn') &&
                    !e.target.classList.contains('delete-circle-btn')) {
                    this.expandCard(person.id);
                }
            };
        }

        document.getElementById('cardsContainer').appendChild(card);

        // Relationship label with alternating colors
        const label = document.createElement('div');
        label.className = 'relationship-label';
        label.contentEditable = 'true';
        label.textContent = person.relationship || '';
        label.style.left = (person.x + 75 - 30) + 'px';
        label.style.top = (person.y - 25) + 'px';
        
        // Alternating colors based on generation and index
        const colors = ['#667eea', '#48bb78', '#f56565', '#ed8936', '#9f7aea', '#38b2ac'];
        const colorIndex = (generation + (parentId ? this.getPersonIndex(parentId) : 0)) % colors.length;
        
        label.onblur = () => {
            person.relationship = label.textContent;
            this.save();
        };
        label.onclick = (e) => e.stopPropagation();
        if (!person.relationship) {
            label.style.background = 'transparent';
            label.style.border = '1px dashed #ccc';
            label.style.color = '#999';
        } else {
            label.style.background = colors[colorIndex];
        }
        document.getElementById('cardsContainer').appendChild(label);

        if (person.children && person.children.length > 0) {
            person.children.forEach(child => {
                this.renderPerson(child, person.id, generation + 1);
            });
        }
    }

    expandCard(id) {
        this.expandedCardId = id;
        this.render();
    }

    collapseCard() {
        this.expandedCardId = null;
        this.render();
    }

    getPersonIndex(personId) {
        let index = 0;
        const findIndex = (persons) => {
            for (let i = 0; i < persons.length; i++) {
                if (persons[i].id === personId) return i;
                if (persons[i].children) {
                    const found = findIndex(persons[i].children);
                    if (found !== -1) return found;
                }
            }
            return -1;
        };
        return findIndex(this.familyData);
    }

    drawConnections() {
        const svg = document.getElementById('connectionsSvg');
        // Bring SVG above cards to ensure arrows/lines are visible (non-destructive)
        try { svg.style.zIndex = '5'; svg.style.position = 'absolute'; } catch(e) {}
        console.log('drawConnections: running, svg=', svg);
        svg.innerHTML = '';
        svg.setAttribute('width', '10000');
        svg.setAttribute('height', '10000');

        const drawLine = (person, generation) => {
            if (person.children && person.children.length > 0) {
                const parentX = person.x + 75;
                const parentY = person.y + 150;

                person.children.forEach(child => {
                    const childX = child.x + 75;
                    const childY = child.y;
                    const midY = (parentY + childY) / 2;

                    // Draw line path
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    line.setAttribute('d', `M ${parentX} ${parentY} L ${parentX} ${midY} L ${childX} ${midY} L ${childX} ${childY}`);
                    line.setAttribute('stroke', '#667eea');
                    line.setAttribute('stroke-width', '3');
                    line.setAttribute('fill', 'none');
                    line.setAttribute('class', 'flow-line');
                    svg.appendChild(line);

                    // Add BIG static arrow pointing to child
                    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                    arrow.setAttribute('points', `${childX-10},${childY-20} ${childX+10},${childY-20} ${childX},${childY-5}`);
                    arrow.setAttribute('fill', '#f56565');
                    arrow.setAttribute('stroke', '#fff');
                    arrow.setAttribute('stroke-width', '2');
                    svg.appendChild(arrow);

                    // Add small static arrow near the PARENT pointing outward towards this child
                    // This creates one arrow per child on the parent side (non-destructive addition).
                    try {
                        const dx = childX - parentX;
                        const dy = childY - parentY;
                        const angle = Math.atan2(dy, dx);

                        // Position the parent arrow some distance from the parent's center
                        const distanceFromParent = 60; // tweakable
                        const ax = parentX + Math.cos(angle) * distanceFromParent;
                        const ay = parentY + Math.sin(angle) * distanceFromParent;

                        // Arrow geometry
                        const arrowLength = 12;
                        const arrowWidth = 8;
                        const tipX = ax + Math.cos(angle) * arrowLength;
                        const tipY = ay + Math.sin(angle) * arrowLength;
                        const leftX = ax + Math.cos(angle + Math.PI / 2) * arrowWidth;
                        const leftY = ay + Math.sin(angle + Math.PI / 2) * arrowWidth;
                        const rightX = ax + Math.cos(angle - Math.PI / 2) * arrowWidth;
                        const rightY = ay + Math.sin(angle - Math.PI / 2) * arrowWidth;

                        const parentArrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        parentArrow.setAttribute('points', `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`);
                        parentArrow.setAttribute('fill', '#48bb78');
                        parentArrow.setAttribute('stroke', '#fff');
                        parentArrow.setAttribute('stroke-width', '1.5');
                        parentArrow.setAttribute('class', 'arrow-marker');
                        svg.appendChild(parentArrow);
                    } catch (e) {
                        // If any math fails, ignore to avoid breaking rendering
                    }

                    drawLine(child, generation + 1);
                });
            }
        };

        if (this.familyData.length > 0) {
            drawLine(this.familyData[0], 0);
        }
        // Debug: report number of children appended to SVG so user can verify in console
        try { console.log('drawConnections: svg child count =', svg.children.length); } catch(e) {}
    }


    findPerson(id, persons = this.familyData) {
        for (let person of persons) {
            if (person.id === id) return person;
            if (person.children) {
                const found = this.findPerson(id, person.children);
                if (found) return found;
            }
        }
        return null;
    }

    findParent(childId, persons = this.familyData) {
        for (let person of persons) {
            if (person.children) {
                for (let child of person.children) {
                    if (child.id === childId) return person;
                }
                const found = this.findParent(childId, person.children);
                if (found) return found;
            }
        }
        return null;
    }

    updatePerson(id, field, value) {
        const person = this.findPerson(id);
        if (person) {
            person[field] = value;
            this.save();
            this.render();
            this.updateStatistics();
        }
    }

    addChild(parentId) {
        const parent = this.findPerson(parentId);
        if (parent) {
            if (!parent.children) parent.children = [];
            const newChild = {
                id: this.generateId(),
                name: 'New Person',
                birth: '',
                death: '',
                gender: 'male',
                image: '',
                notes: '',
                relationship: '',
                children: []
            };
            parent.children.push(newChild);
            this.expandedCardId = newChild.id;
            this.save();
            this.render();
            this.updateStatistics();
        }
    }

    deletePerson(id) {
        if (this.familyData[0].id === id) {
            if (!confirm('Delete root? Clears entire tree.')) return;
            this.familyData = [{
                id: this.generateId(),
                name: 'Root Ancestor',
                birth: '',
                death: '',
                gender: 'male',
                image: '',
                notes: '',
                relationship: '',
                children: []
            }];
        } else {
            if (!confirm('Delete this person and descendants?')) return;
            const parent = this.findParent(id);
            if (parent && parent.children) {
                parent.children = parent.children.filter(child => child.id !== id);
            }
        }
        this.save();
        this.render();
        this.updateStatistics();
    }

    uploadImage(id) {
        document.getElementById('file_' + id).click();
    }

    handleImageUpload(id, event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.updatePerson(id, 'image', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    searchPerson(query) {
        const cards = document.querySelectorAll('.person-card');
        cards.forEach(card => {
            card.style.opacity = '1';
            card.style.filter = 'none';
        });

        if (query.trim() === '') return;

        const searchInPerson = (person) => {
            const matches = person.name.toLowerCase().includes(query.toLowerCase()) ||
                person.birth.includes(query) ||
                person.death.includes(query) ||
                person.notes.toLowerCase().includes(query.toLowerCase());

            const card = document.getElementById('card_' + person.id);
            if (card) {
                if (!matches) {
                    card.style.opacity = '0.3';
                    card.style.filter = 'grayscale(100%)';
                }
            }

            if (person.children) {
                person.children.forEach(searchInPerson);
            }
        };

        this.familyData.forEach(searchInPerson);
    }

    exportJSON() {
        const modal = document.getElementById('exportModal');
        const textarea = document.getElementById('exportTextarea');
        textarea.value = JSON.stringify(this.familyData, null, 2);
        modal.classList.add('active');
    }

    importJSON() {
        const modal = document.getElementById('importModal');
        modal.classList.add('active');
    }

    confirmImport() {
        const textarea = document.getElementById('importTextarea');
        try {
            const data = JSON.parse(textarea.value);
            this.familyData = data;
            this.save();
            this.render();
            this.updateStatistics();
            this.closeModal();
            alert('Imported successfully!');
        } catch (e) {
            alert('Invalid JSON data');
        }
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    copyToClipboard() {
        const textarea = document.getElementById('exportTextarea');
        textarea.select();
        document.execCommand('copy');
        alert('Copied!');
    }

    downloadJSON() {
        const dataStr = JSON.stringify(this.familyData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'family_tree_' + new Date().toISOString().split('T')[0] + '.json';
        link.click();
        URL.revokeObjectURL(url);
    }

    exportImage() {
        alert('To export:\n1. Press Ctrl+P\n2. Save as PDF');
        window.print();
    }

    clearAll() {
        if (!confirm('Clear all data?')) return;
        this.familyData = [{
            id: this.generateId(),
            name: 'Root Ancestor',
            birth: '',
            death: '',
            gender: 'male',
            image: '',
            notes: '',
            relationship: '',
            children: []
        }];
        this.save();
        this.render();
        this.updateStatistics();
    }

    zoomIn() {
        this.scale *= 1.2;
        this.scale = Math.min(3, this.scale);
        this.updateTransform();
    }

    zoomOut() {
        this.scale *= 0.8;
        this.scale = Math.max(0.1, this.scale);
        this.updateTransform();
    }

    resetZoom() {
        this.scale = 1;
        this.translateX = 50;
        this.translateY = 50;
        this.updateTransform();
    }

    updateStatistics() {
        let total = 0, males = 0, females = 0, living = 0, deceased = 0;

        const countPerson = (person) => {
            total++;
            if (person.gender === 'male') males++;
            else females++;
            if (person.death) deceased++;
            else living++;
            if (person.children) {
                person.children.forEach(countPerson);
            }
        };

        this.familyData.forEach(countPerson);
        const generations = this.getMaxLevel(this.familyData, 0) + 1;

        document.getElementById('totalMembers').textContent = total;
        document.getElementById('totalMales').textContent = males;
        document.getElementById('totalFemales').textContent = females;
        document.getElementById('totalLiving').textContent = living;
        document.getElementById('totalDeceased').textContent = deceased;
        document.getElementById('totalGenerations').textContent = generations;
    }

    showStats() {
        const modal = document.getElementById('statsModal');
        const content = document.getElementById('statsContent');

        let total = 0, males = 0, females = 0, living = 0, deceased = 0;

        const countPerson = (person) => {
            total++;
            if (person.gender === 'male') males++;
            else females++;
            if (person.death) deceased++;
            else living++;
            if (person.children) {
                person.children.forEach(countPerson);
            }
        };

        this.familyData.forEach(countPerson);
        const generations = this.getMaxLevel(this.familyData, 0) + 1;

        content.innerHTML = `
            <p><strong>Total Members:</strong> ${total}</p>
            <p><strong>Males:</strong> ${males} (${((males / total) * 100).toFixed(1)}%)</p>
            <p><strong>Females:</strong> ${females} (${((females / total) * 100).toFixed(1)}%)</p>
            <p><strong>Living:</strong> ${living}</p>
            <p><strong>Deceased:</strong> ${deceased}</p>
            <p><strong>Generations:</strong> ${generations}</p>
        `;
        modal.classList.add('active');
    }

    save() {
        localStorage.setItem('familyTreeData', JSON.stringify(this.familyData));
    }

    // Add multiple children to a parent by id. childrenArray should be array of person objects (without id)
    addChildrenToParent(parentId, childrenArray) {
        const parent = this.findPerson(parentId);
        if (!parent) return false;
        parent.children = parent.children || [];
        childrenArray.forEach(child => {
            const newChild = Object.assign({
                id: this.generateId(),
                name: 'New Person',
                birth: '',
                death: '',
                gender: 'male',
                image: '',
                notes: '',
                relationship: '',
                children: []
            }, child);
            parent.children.push(newChild);
        });
        this.save();
        this.render();
        this.updateStatistics();
        return true;
    }

    // Auto add a small sample: 3 children to root and one grandchild under the first child
    autoAddSample() {
        if (!this.familyData || this.familyData.length === 0) return;
        const rootId = this.familyData[0].id;
        const sampleKids = [
            { name: 'Child A', gender: 'male' },
            { name: 'Child B', gender: 'female' },
            { name: 'Child C', gender: 'female' }
        ];
        this.addChildrenToParent(rootId, sampleKids);
        // add grandchild to the first newly added child
        const firstChild = this.familyData[0].children && this.familyData[0].children[0];
        if (firstChild) {
            this.addChildrenToParent(firstChild.id, [{ name: 'Grandchild A1', gender: 'female' }]);
        }
        alert('Sample children added.');
    }

    changeBackground(bg) {
        if (bg) {
            document.body.style.background = bg;
            localStorage.setItem('familyTreeBackground', bg);
        }
    }

    changeLayout(mode) {
        this.layoutMode = mode;
        localStorage.setItem('layoutMode', mode);
        this.setLayoutSpacing();
        this.render();
    }
}

const app = new FamilyTreeApp();

// Restore background
const savedBg = localStorage.getItem('familyTreeBackground');
if (savedBg) {
    document.body.style.background = savedBg;
    document.getElementById('bgSelector').value = savedBg;
}

// Restore layout
const savedLayout = localStorage.getItem('layoutMode');
if (savedLayout) {
    document.getElementById('layoutSelector').value = savedLayout;
}
