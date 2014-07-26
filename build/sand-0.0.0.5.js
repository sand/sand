/**
* matter-0.8.0.js 0.8.0-alpha 2014-05-04
* http://brm.io/matter-js/
* License: MIT
*/

/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014 Liam Brummitt
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function() {

var Matter = {};

// Begin Matter namespace closure

// All Matter modules are included below during build
// Outro.js then closes at the end of the file


// Begin src/body/Body.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Body
*/

var Body = {};

(function() {

    var _nextGroupId = 1;

    /**
     * Description to be written.
     * @method create
     * @param {} options
     * @return {body} body
     */
    Body.create = function(options) {
        var defaults = {
            id: Common.nextId(),
            type: 'body',
            label: 'Body',
            angle: 0,
            vertices: Vertices.fromPath('L 0 0 L 40 0 L 40 40 L 0 40'),
            position: { x: 0, y: 0 },
            force: { x: 0, y: 0 },
            torque: 0,
            positionImpulse: { x: 0, y: 0 },
            constraintImpulse: { x: 0, y: 0, angle: 0 },
            speed: 0,
            angularSpeed: 0,
            velocity: { x: 0, y: 0 },
            angularVelocity: 0,
            isStatic: false,
            isSleeping: false,
            motion: 0,
            sleepThreshold: 60,
            density: 0.001,
            restitution: 0,
            friction: 0.1,
            frictionAir: 0.01,
            groupId: 0,
            slop: 0.05,
            timeScale: 1,
            render: {
                visible: true,
                sprite: {
                    xScale: 1,
                    yScale: 1
                },
                lineWidth: 1.5
            }
        };

        var body = Common.extend(defaults, options);

        _initProperties(body);

        return body;
    };

    /**
     * Description
     * @method nextGroupId
     * @return {Number} Unique groupID
     */
    Body.nextGroupId = function() {
        return _nextGroupId++;
    };

    /**
     * Initialises body properties
     * @method _initProperties
     * @private
     * @param {body} body
     */
    var _initProperties = function(body) {
        // calculated properties
        body.axes = body.axes || Axes.fromVertices(body.vertices);
        body.area = Vertices.area(body.vertices);
        body.bounds = Bounds.create(body.vertices);
        body.mass = body.mass || (body.density * body.area);
        body.inverseMass = 1 / body.mass;
        body.inertia = body.inertia || Vertices.inertia(body.vertices, body.mass);
        body.inverseInertia = 1 / body.inertia;
        body.positionPrev = body.positionPrev || { x: body.position.x, y: body.position.y };
        body.anglePrev = body.anglePrev || body.angle;
        body.render.fillStyle = body.render.fillStyle || (body.isStatic ? '#eeeeee' : Common.choose(['#556270', '#4ECDC4', '#C7F464', '#FF6B6B', '#C44D58']));
        body.render.strokeStyle = body.render.strokeStyle || Common.shadeColor(body.render.fillStyle, -20);

        // update geometry
        Vertices.create(body.vertices, body);
        var centre = Vertices.centre(body.vertices);
        Vertices.translate(body.vertices, body.position);
        Vertices.translate(body.vertices, centre, -1);
        Vertices.rotate(body.vertices, body.angle, body.position);
        Axes.rotate(body.axes, body.angle);
        Bounds.update(body.bounds, body.vertices, body.velocity);

        Body.setStatic(body, body.isStatic);
        Sleeping.set(body, body.isSleeping);
    };

    /**
     * Sets the body as static, including isStatic flag and setting mass and inertia to Infinity
     * @method setStatic
     * @param {bool} isStatic
     */
    Body.setStatic = function(body, isStatic) {
        body.isStatic = isStatic;

        if (isStatic) {
            body.restitution = 0;
            body.friction = 1;
            body.mass = body.inertia = body.density = Infinity;
            body.inverseMass = body.inverseInertia = 0;
            body.render.lineWidth = 1;

            body.positionPrev.x = body.position.x;
            body.positionPrev.y = body.position.y;
            body.anglePrev = body.angle;
            body.angularVelocity = 0;
            body.speed = 0;
            body.angularSpeed = 0;
            body.motion = 0;
        }
    };

    /**
     * Description
     * @method resetForcesAll
     * @param {body[]} bodies
     */
    Body.resetForcesAll = function(bodies) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            // reset force buffers
            body.force.x = 0;
            body.force.y = 0;
            body.torque = 0;
        }
    };

    /**
     * Description
     * @method applyGravityAll
     * @param {body[]} bodies
     * @param {vector} gravity
     */
    Body.applyGravityAll = function(bodies, gravity) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.isStatic || body.isSleeping)
                continue;

            // apply gravity
            body.force.y += body.mass * gravity.y * 0.001;
            body.force.x += body.mass * gravity.x * 0.001;
        }
    };

    /**
     * Description
     * @method updateAll
     * @param {body[]} bodies
     * @param {number} deltaTime
     * @param {number} timeScale
     * @param {number} correction
     * @param {bounds} worldBounds
     */
    Body.updateAll = function(bodies, deltaTime, timeScale, correction, worldBounds) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.isStatic || body.isSleeping)
                continue;

            // don't update out of world bodies
            // TODO: viewports
            if (body.bounds.max.x < worldBounds.min.x || body.bounds.min.x > worldBounds.max.x
                || body.bounds.max.y < worldBounds.min.y || body.bounds.min.y > worldBounds.max.y)
                continue;

            Body.update(body, deltaTime, timeScale, correction);
        }
    };

    /**
     * Description
     * @method update
     * @param {body} body
     * @param {number} deltaTime
     * @param {number} timeScale
     * @param {number} correction
     */
    Body.update = function(body, deltaTime, timeScale, correction) {
        var deltaTimeSquared = Math.pow(deltaTime * timeScale * body.timeScale, 2);

        // from the previous step
        var frictionAir = 1 - body.frictionAir * timeScale * body.timeScale,
            velocityPrevX = body.position.x - body.positionPrev.x,
            velocityPrevY = body.position.y - body.positionPrev.y;

        // update velocity with verlet integration
        body.velocity.x = (velocityPrevX * frictionAir * correction) + (body.force.x / body.mass) * deltaTimeSquared;
        body.velocity.y = (velocityPrevY * frictionAir * correction) + (body.force.y / body.mass) * deltaTimeSquared;

        body.positionPrev.x = body.position.x;
        body.positionPrev.y = body.position.y;
        body.position.x += body.velocity.x;
        body.position.y += body.velocity.y;

        // update angular velocity with verlet integration
        body.angularVelocity = ((body.angle - body.anglePrev) * frictionAir * correction) + (body.torque / body.inertia) * deltaTimeSquared;
        body.anglePrev = body.angle;
        body.angle += body.angularVelocity;

        // track speed and acceleration
        body.speed = Vector.magnitude(body.velocity);
        body.angularSpeed = Math.abs(body.angularVelocity);

        // transform the body geometry
        Vertices.translate(body.vertices, body.velocity);
        if (body.angularVelocity !== 0) {
            Vertices.rotate(body.vertices, body.angularVelocity, body.position);
            Axes.rotate(body.axes, body.angularVelocity);
        }
        Bounds.update(body.bounds, body.vertices, body.velocity);
    };

    /**
     * Description
     * @method applyForce
     * @param {body} body
     * @param {vector} position
     * @param {vector} force
     */
    Body.applyForce = function(body, position, force) {
        body.force.x += force.x;
        body.force.y += force.y;
        var offset = { x: position.x - body.position.x, y: position.y - body.position.y };
        body.torque += (offset.x * force.y - offset.y * force.x) * body.inverseInertia;
    };

    /**
     * Description
     * @method translate
     * @param {body} body
     * @param {vector} translation
     */
    Body.translate = function(body, translation) {
        body.positionPrev.x += translation.x;
        body.positionPrev.y += translation.y;
        body.position.x += translation.x;
        body.position.y += translation.y;
        Vertices.translate(body.vertices, translation);
        Bounds.update(body.bounds, body.vertices, body.velocity);
    };

    /**
     * Description
     * @method rotate
     * @param {body} body
     * @param {number} angle
     */
    Body.rotate = function(body, angle) {
        body.anglePrev += angle;
        body.angle += angle;
        Vertices.rotate(body.vertices, angle, body.position);
        Axes.rotate(body.axes, angle);
        Bounds.update(body.bounds, body.vertices, body.velocity);
    };

    /**
     * Scales the body, including updating physical properties (mass, area, axes, inertia), from a point (default is centre)
     * @method translate
     * @param {body} body
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {vector} point
     */
    Body.scale = function(body, scaleX, scaleY, point) {
        // scale vertices
        Vertices.scale(body.vertices, scaleX, scaleY, point);

        // update properties
        body.axes = Axes.fromVertices(body.vertices);
        body.area = Vertices.area(body.vertices);
        body.mass = body.density * body.area;
        body.inverseMass = 1 / body.mass;

        // update inertia (requires vertices to be at origin)
        Vertices.translate(body.vertices, { x: -body.position.x, y: -body.position.y });
        body.inertia = Vertices.inertia(body.vertices, body.mass);
        body.inverseInertia = 1 / body.inertia;
        Vertices.translate(body.vertices, { x: body.position.x, y: body.position.y });

        // update bounds
        Bounds.update(body.bounds, body.vertices, body.velocity);
    };

})();

;   // End src/body/Body.js


// Begin src/body/Composite.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Composite
*/

// TODO: composite translate, rotate

var Composite = {};

(function() {

    /**
     * Description
     * @method create
     * @param {} options
     * @return {composite} A new composite
     */
    Composite.create = function(options) {
        return Common.extend({ 
            id: Common.nextId(),
            type: 'composite',
            parent: null,
            isModified: false,
            bodies: [], 
            constraints: [], 
            composites: [],
            label: 'Composite'
        }, options);
    };

    /**
     * Sets the composite's `isModified` flag. 
     * If `updateParents` is true, all parents will be set (default: false).
     * If `updateChildren` is true, all children will be set (default: false).
     * @method setModified
     * @param {composite} composite
     * @param {boolean} isModified
     * @param {boolean} updateParents
     * @param {boolean} updateChildren
     */
    Composite.setModified = function(composite, isModified, updateParents, updateChildren) {
        composite.isModified = isModified;

        if (updateParents && composite.parent) {
            Composite.setModified(composite.parent, isModified, updateParents, updateChildren);
        }

        if (updateChildren) {
            for(var i = 0; i < composite.composites.length; i++) {
                var childComposite = composite.composites[i];
                Composite.setModified(childComposite, isModified, updateParents, updateChildren);
            }
        }
    };

    /**
     * Generic add function. Adds one or many body(s), constraint(s) or a composite(s) to the given composite.
     * @method add
     * @param {composite} composite
     * @param {} object
     * @return {composite} The original composite with the objects added
     */
    Composite.add = function(composite, object) {
        var objects = [].concat(object);

        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];

            switch (obj.type) {

            case 'body':
                Composite.addBody(composite, obj);
                break;
            case 'constraint':
                Composite.addConstraint(composite, obj);
                break;
            case 'composite':
                Composite.addComposite(composite, obj);
                break;
            case 'mouseConstraint':
                Composite.addConstraint(composite, obj.constraint);
                break;

            }
        }

        return composite;
    };

    /**
     * Generic remove function. Removes one or many body(s), constraint(s) or a composite(s) to the given composite.
     * Optionally searching its children recursively.
     * @method remove
     * @param {composite} composite
     * @param {} object
     * @param {boolean} deep
     * @return {composite} The original composite with the objects removed
     */
    Composite.remove = function(composite, object, deep) {
        var objects = [].concat(object);

        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];

            switch (obj.type) {

            case 'body':
                Composite.removeBody(composite, obj, deep);
                break;
            case 'constraint':
                Composite.removeConstraint(composite, obj, deep);
                break;
            case 'composite':
                Composite.removeComposite(composite, obj, deep);
                break;
            case 'mouseConstraint':
                Composite.removeConstraint(composite, obj.constraint);
                break;

            }
        }

        return composite;
    };

    /**
     * Description
     * @method addComposite
     * @param {composite} compositeA
     * @param {composite} compositeB
     * @return {composite} The original compositeA with the objects from compositeB added
     */
    Composite.addComposite = function(compositeA, compositeB) {
        compositeA.composites.push(compositeB);
        compositeB.parent = compositeA;
        Composite.setModified(compositeA, true, true, false);
        return compositeA;
    };

    /**
     * Removes a composite from the given composite, and optionally searching its children recursively
     * @method removeComposite
     * @param {composite} compositeA
     * @param {composite} compositeB
     * @param {boolean} deep
     * @return {composite} The original compositeA with the composite removed
     */
    Composite.removeComposite = function(compositeA, compositeB, deep) {
        var position = compositeA.composites.indexOf(compositeB);
        if (position !== -1) {
            Composite.removeCompositeAt(compositeA, position);
            Composite.setModified(compositeA, true, true, false);
        }

        if (deep) {
            for (var i = 0; i < compositeA.composites.length; i++){
                Composite.removeComposite(compositeA.composites[i], compositeB, true);
            }
        }

        return compositeA;
    };

    /**
     * Removes a composite from the given composite
     * @method removeCompositeAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the composite removed
     */
    Composite.removeCompositeAt = function(composite, position) {
        composite.composites.splice(position, 1);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Description
     * @method addBody
     * @param {composite} composite
     * @param {body} body
     * @return {composite} The original composite with the body added
     */
    Composite.addBody = function(composite, body) {
        composite.bodies.push(body);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Removes a body from the given composite, and optionally searching its children recursively
     * @method removeBody
     * @param {composite} composite
     * @param {body} body
     * @param {boolean} deep
     * @return {composite} The original composite with the body removed
     */
    Composite.removeBody = function(composite, body, deep) {
        var position = composite.bodies.indexOf(body);
        if (position !== -1) {
            Composite.removeBodyAt(composite, position);
            Composite.setModified(composite, true, true, false);
        }

        if (deep) {
            for (var i = 0; i < composite.composites.length; i++){
                Composite.removeBody(composite.composites[i], body, true);
            }
        }

        return composite;
    };

    /**
     * Removes a body from the given composite
     * @method removeBodyAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the body removed
     */
    Composite.removeBodyAt = function(composite, position) {
        composite.bodies.splice(position, 1);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Description
     * @method addConstraint
     * @param {composite} composite
     * @param {constraint} constraint
     * @return {composite} The original composite with the constraint added
     */
    Composite.addConstraint = function(composite, constraint) {
        composite.constraints.push(constraint);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Removes a constraint from the given composite, and optionally searching its children recursively
     * @method removeConstraint
     * @param {composite} composite
     * @param {constraint} constraint
     * @param {boolean} deep
     * @return {composite} The original composite with the constraint removed
     */
    Composite.removeConstraint = function(composite, constraint, deep) {
        var position = composite.constraints.indexOf(constraint);
        if (position !== -1) {
            Composite.removeConstraintAt(composite, position);
        }

        if (deep) {
            for (var i = 0; i < composite.composites.length; i++){
                Composite.removeConstraint(composite.composites[i], constraint, true);
            }
        }

        return composite;
    };

    /**
     * Removes a body from the given composite
     * @method removeConstraintAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the constraint removed
     */
    Composite.removeConstraintAt = function(composite, position) {
        composite.constraints.splice(position, 1);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Removes all bodies, constraints and composites from the given composite
     * Optionally clearing its children recursively
     * @method clear
     * @param {world} world
     * @param {boolean} keepStatic
     * @param {boolean} deep
     */
    Composite.clear = function(composite, keepStatic, deep) {
        if (deep) {
            for (var i = 0; i < composite.composites.length; i++){
                Composite.clear(composite.composites[i], keepStatic, true);
            }
        }
        
        if (keepStatic) {
            composite.bodies = composite.bodies.filter(function(body) { return body.isStatic; });
        } else {
            composite.bodies.length = 0;
        }

        composite.constraints.length = 0;
        composite.composites.length = 0;
        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Returns all bodies in the given composite, including all bodies in its children, recursively
     * @method allBodies
     * @param {composite} composite
     * @return {body[]} All the bodies
     */
    Composite.allBodies = function(composite) {
        var bodies = [].concat(composite.bodies);

        for (var i = 0; i < composite.composites.length; i++)
            bodies = bodies.concat(Composite.allBodies(composite.composites[i]));

        return bodies;
    };

    /**
     * Returns all constraints in the given composite, including all constraints in its children, recursively
     * @method allConstraints
     * @param {composite} composite
     * @return {constraint[]} All the constraints
     */
    Composite.allConstraints = function(composite) {
        var constraints = [].concat(composite.constraints);

        for (var i = 0; i < composite.composites.length; i++)
            constraints = constraints.concat(Composite.allConstraints(composite.composites[i]));

        return constraints;
    };

    /**
     * Returns all composites in the given composite, including all composites in its children, recursively
     * @method allComposites
     * @param {composite} composite
     * @return {composite[]} All the composites
     */
    Composite.allComposites = function(composite) {
        var composites = [].concat(composite.composites);

        for (var i = 0; i < composite.composites.length; i++)
            composites = composites.concat(Composite.allComposites(composite.composites[i]));

        return composites;
    };

    /**
     * Searches the composite recursively for an object matching the type and id supplied, null if not found
     * @method get
     * @param {composite} composite
     * @param {number} id
     * @param {string} type
     * @return {object} The requested object, if found
     */
    Composite.get = function(composite, id, type) {
        var objects,
            object;

        switch (type) {
        case 'body':
            objects = Composite.allBodies(composite);
            break;
        case 'constraint':
            objects = Composite.allConstraints(composite);
            break;
        case 'composite':
            objects = Composite.allComposites(composite).concat(composite);
            break;
        }

        if (!objects)
            return null;

        object = objects.filter(function(object) { 
            return object.id.toString() === id.toString(); 
        });

        return object.length === 0 ? null : object[0];
    };

    /**
     * Moves the given object(s) from compositeA to compositeB (equal to a remove followed by an add)
     * @method move
     * @param {compositeA} compositeA
     * @param {object[]} objects
     * @param {compositeB} compositeB
     * @return {composite} Returns compositeA
     */
    Composite.move = function(compositeA, objects, compositeB) {
        Composite.remove(compositeA, objects);
        Composite.add(compositeB, objects);
        return compositeA;
    };

    /**
     * Assigns new ids for all objects in the composite, recursively
     * @method rebase
     * @param {composite} composite
     * @return {composite} Returns composite
     */
    Composite.rebase = function(composite) {
        var objects = Composite.allBodies(composite)
                        .concat(Composite.allConstraints(composite))
                        .concat(Composite.allComposites(composite));

        for (var i = 0; i < objects.length; i++) {
            objects[i].id = Common.nextId();
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };

})();

;   // End src/body/Composite.js


// Begin src/body/World.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class World
*/

var World = {};

(function() {

    /**
     * Description
     * @method create
     * @constructor
     * @param {} options
     * @return {world} A new world
     */
    World.create = function(options) {
        var composite = Composite.create();

        var defaults = {
            label: 'World',
            gravity: { x: 0, y: 1 },
            bounds: { 
                min: { x: 0, y: 0 }, 
                //max: { x: Infinity, y: Infinity }
                max: { x: 5000, y: 5000 }
            }
        };
        
        return Common.extend(composite, defaults, options);
    };

    // World is a Composite body
    // see src/module/Outro.js for these aliases:
    
    /**
     * An alias for Composite.clear since World is also a Composite (see Outro.js)
     * @method clear
     * @param {world} world
     * @param {boolean} keepStatic
     */

    /**
     * An alias for Composite.add since World is also a Composite (see Outro.js)
     * @method addComposite
     * @param {world} world
     * @param {composite} composite
     * @return {world} The original world with the objects from composite added
     */
    
     /**
      * An alias for Composite.addBody since World is also a Composite (see Outro.js)
      * @method addBody
      * @param {world} world
      * @param {body} body
      * @return {world} The original world with the body added
      */

     /**
      * An alias for Composite.addConstraint since World is also a Composite (see Outro.js)
      * @method addConstraint
      * @param {world} world
      * @param {constraint} constraint
      * @return {world} The original world with the constraint added
      */

})();

;   // End src/body/World.js


// Begin src/collision/Contact.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Contact
*/

var Contact = {};

(function() {

    /**
     * Description
     * @method create
     * @param {vertex} vertex
     * @return {contact} A new contact
     */
    Contact.create = function(vertex) {
        return {
            id: Contact.id(vertex),
            vertex: vertex,
            normalImpulse: 0,
            tangentImpulse: 0
        };
    };
    
    /**
     * Description
     * @method id
     * @param {vertex} vertex
     * @return {Number} Unique contactID
     */
    Contact.id = function(vertex) {
        return vertex.body.id + '_' + vertex.index;
    };

})();

;   // End src/collision/Contact.js


// Begin src/collision/Detector.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Detector
*/

// TODO: speculative contacts

var Detector = {};

(function() {

    /**
     * Description
     * @method collisions
     * @param {pair[]} broadphasePairs
     * @param {engine} engine
     * @return {array} collisions
     */
    Detector.collisions = function(broadphasePairs, engine) {
        var collisions = [],
            metrics = engine.metrics,
            pairsTable = engine.pairs.table;

        for (var i = 0; i < broadphasePairs.length; i++) {
            var bodyA = broadphasePairs[i][0], 
                bodyB = broadphasePairs[i][1];

            // NOTE: could share a function for the below, but may drop performance?

            if (bodyA.groupId && bodyB.groupId && bodyA.groupId === bodyB.groupId)
                continue;

            if ((bodyA.isStatic || bodyA.isSleeping) && (bodyB.isStatic || bodyB.isSleeping))
                continue;

            metrics.midphaseTests += 1;

            // mid phase
            if (Bounds.overlaps(bodyA.bounds, bodyB.bounds)) {

                // find a previous collision we could reuse
                var pairId = Pair.id(bodyA, bodyB),
                    pair = pairsTable[pairId],
                    previousCollision;

                if (pair && pair.isActive) {
                    previousCollision = pair.collision;
                } else {
                    previousCollision = null;
                }

                // narrow phase
                var collision = SAT.collides(bodyA, bodyB, previousCollision);

                metrics.narrowphaseTests += 1;

                if (collision.reused)
                    metrics.narrowReuseCount += 1;

                if (collision.collided) {
                    collisions.push(collision);
                    metrics.narrowDetections += 1;
                }
            }
        }

        return collisions;
    };

    /**
     * Description
     * @method bruteForce
     * @param {body[]} bodies
     * @param {engine} engine
     * @return {array} collisions
     */
    Detector.bruteForce = function(bodies, engine) {
        var collisions = [],
            metrics = engine.metrics,
            pairsTable = engine.pairs.table;

        for (var i = 0; i < bodies.length; i++) {
            for (var j = i + 1; j < bodies.length; j++) {
                var bodyA = bodies[i], 
                    bodyB = bodies[j];

                // NOTE: could share a function for the below, but may drop performance?

                if (bodyA.groupId && bodyB.groupId && bodyA.groupId === bodyB.groupId)
                    continue;

                if ((bodyA.isStatic || bodyA.isSleeping) && (bodyB.isStatic || bodyB.isSleeping))
                    continue;

                metrics.midphaseTests += 1;

                // mid phase
                if (Bounds.overlaps(bodyA.bounds, bodyB.bounds)) {

                    // find a previous collision we could reuse
                    var pairId = Pair.id(bodyA, bodyB),
                        pair = pairsTable[pairId],
                        previousCollision;

                    if (pair && pair.isActive) {
                        previousCollision = pair.collision;
                    } else {
                        previousCollision = null;
                    }

                    // narrow phase
                    var collision = SAT.collides(bodyA, bodyB, previousCollision);

                    metrics.narrowphaseTests += 1;

                    if (collision.reused)
                        metrics.narrowReuseCount += 1;

                    if (collision.collided) {
                        collisions.push(collision);
                        metrics.narrowDetections += 1;
                    }
                }
            }
        }

        return collisions;
    };

})();

;   // End src/collision/Detector.js


// Begin src/collision/Grid.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Grid
*/

var Grid = {};

(function() {

    /**
     * Description
     * @method create
     * @param {number} bucketWidth
     * @param {number} bucketHeight
     * @return {grid} A new grid
     */
    Grid.create = function(bucketWidth, bucketHeight) {
        return {
            buckets: {},
            pairs: {},
            pairsList: [],
            bucketWidth: bucketWidth || 48,
            bucketHeight: bucketHeight || 48
        };
    };

    /**
     * Description
     * @method update
     * @param {grid} grid
     * @param {body[]} bodies
     * @param {engine} engine
     * @param {boolean} forceUpdate
     */
    Grid.update = function(grid, bodies, engine, forceUpdate) {
        var i, col, row,
            world = engine.world,
            buckets = grid.buckets,
            bucket,
            bucketId,
            metrics = engine.metrics,
            gridChanged = false;

        metrics.broadphaseTests = 0;

        for (i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.isSleeping && !forceUpdate)
                continue;

            // don't update out of world bodies
            if (body.bounds.max.x < 0 || body.bounds.min.x > world.bounds.width
                || body.bounds.max.y < 0 || body.bounds.min.y > world.bounds.height)
                continue;

            var newRegion = _getRegion(grid, body);

            // if the body has changed grid region
            if (!body.region || newRegion.id !== body.region.id || forceUpdate) {

                metrics.broadphaseTests += 1;

                if (!body.region || forceUpdate)
                    body.region = newRegion;

                var union = _regionUnion(newRegion, body.region);

                // update grid buckets affected by region change
                // iterate over the union of both regions
                for (col = union.startCol; col <= union.endCol; col++) {
                    for (row = union.startRow; row <= union.endRow; row++) {
                        bucketId = _getBucketId(col, row);
                        bucket = buckets[bucketId];

                        var isInsideNewRegion = (col >= newRegion.startCol && col <= newRegion.endCol
                                                && row >= newRegion.startRow && row <= newRegion.endRow);

                        var isInsideOldRegion = (col >= body.region.startCol && col <= body.region.endCol
                                                && row >= body.region.startRow && row <= body.region.endRow);

                        // remove from old region buckets
                        if (!isInsideNewRegion && isInsideOldRegion) {
                            if (isInsideOldRegion) {
                                if (bucket)
                                    _bucketRemoveBody(grid, bucket, body);
                            }
                        }

                        // add to new region buckets
                        if (body.region === newRegion || (isInsideNewRegion && !isInsideOldRegion) || forceUpdate) {
                            if (!bucket)
                                bucket = _createBucket(buckets, bucketId);
                            _bucketAddBody(grid, bucket, body);
                        }
                    }
                }

                // set the new region
                body.region = newRegion;

                // flag changes so we can update pairs
                gridChanged = true;
            }
        }

        // update pairs list only if pairs changed (i.e. a body changed region)
        if (gridChanged)
            grid.pairsList = _createActivePairsList(grid);
    };

    /**
     * Description
     * @method clear
     * @param {grid} grid
     */
    Grid.clear = function(grid) {
        grid.buckets = {};
        grid.pairs = {};
        grid.pairsList = [];
    };

    /**
     * Description
     * @method _regionUnion
     * @private
     * @param {} regionA
     * @param {} regionB
     * @return CallExpression
     */
    var _regionUnion = function(regionA, regionB) {
        var startCol = Math.min(regionA.startCol, regionB.startCol),
            endCol = Math.max(regionA.endCol, regionB.endCol),
            startRow = Math.min(regionA.startRow, regionB.startRow),
            endRow = Math.max(regionA.endRow, regionB.endRow);

        return _createRegion(startCol, endCol, startRow, endRow);
    };

    /**
     * Description
     * @method _getRegion
     * @private
     * @param {} grid
     * @param {} body
     * @return CallExpression
     */
    var _getRegion = function(grid, body) {
        var bounds = body.bounds,
            startCol = Math.floor(bounds.min.x / grid.bucketWidth),
            endCol = Math.floor(bounds.max.x / grid.bucketWidth),
            startRow = Math.floor(bounds.min.y / grid.bucketHeight),
            endRow = Math.floor(bounds.max.y / grid.bucketHeight);

        return _createRegion(startCol, endCol, startRow, endRow);
    };

    /**
     * Description
     * @method _createRegion
     * @private
     * @param {} startCol
     * @param {} endCol
     * @param {} startRow
     * @param {} endRow
     * @return ObjectExpression
     */
    var _createRegion = function(startCol, endCol, startRow, endRow) {
        return { 
            id: startCol + ',' + endCol + ',' + startRow + ',' + endRow,
            startCol: startCol, 
            endCol: endCol, 
            startRow: startRow, 
            endRow: endRow 
        };
    };

    /**
     * Description
     * @method _getBucketId
     * @private
     * @param {} column
     * @param {} row
     * @return BinaryExpression
     */
    var _getBucketId = function(column, row) {
        return column + ',' + row;
    };

    /**
     * Description
     * @method _createBucket
     * @private
     * @param {} buckets
     * @param {} bucketId
     * @return bucket
     */
    var _createBucket = function(buckets, bucketId) {
        var bucket = buckets[bucketId] = [];
        return bucket;
    };

    /**
     * Description
     * @method _bucketAddBody
     * @private
     * @param {} grid
     * @param {} bucket
     * @param {} body
     */
    var _bucketAddBody = function(grid, bucket, body) {
        // add new pairs
        for (var i = 0; i < bucket.length; i++) {
            var bodyB = bucket[i];

            if (body.id === bodyB.id || (body.isStatic && bodyB.isStatic))
                continue;

            // keep track of the number of buckets the pair exists in
            // important for Grid.update to work
            var pairId = Pair.id(body, bodyB),
                pair = grid.pairs[pairId];

            if (pair) {
                pair[2] += 1;
            } else {
                grid.pairs[pairId] = [body, bodyB, 1];
            }
        }

        // add to bodies (after pairs, otherwise pairs with self)
        bucket.push(body);
    };

    /**
     * Description
     * @method _bucketRemoveBody
     * @private
     * @param {} grid
     * @param {} bucket
     * @param {} body
     */
    var _bucketRemoveBody = function(grid, bucket, body) {
        // remove from bucket
        bucket.splice(bucket.indexOf(body), 1);

        // update pair counts
        for (var i = 0; i < bucket.length; i++) {
            // keep track of the number of buckets the pair exists in
            // important for _createActivePairsList to work
            var bodyB = bucket[i],
                pairId = Pair.id(body, bodyB),
                pair = grid.pairs[pairId];

            if (pair)
                pair[2] -= 1;
        }
    };

    /**
     * Description
     * @method _createActivePairsList
     * @private
     * @param {} grid
     * @return pairs
     */
    var _createActivePairsList = function(grid) {
        var pairKeys,
            pair,
            pairs = [];

        // grid.pairs is used as a hashmap
        pairKeys = Common.keys(grid.pairs);

        // iterate over grid.pairs
        for (var k = 0; k < pairKeys.length; k++) {
            pair = grid.pairs[pairKeys[k]];

            // if pair exists in at least one bucket
            // it is a pair that needs further collision testing so push it
            if (pair[2] > 0) {
                pairs.push(pair);
            } else {
                delete grid.pairs[pairKeys[k]];
            }
        }

        return pairs;
    };
    
})();

;   // End src/collision/Grid.js


// Begin src/collision/Pair.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Pair
*/

var Pair = {};

(function() {
    
    /**
     * Description
     * @method create
     * @param {collision} collision
     * @return {pair} A new pair
     */
    Pair.create = function(collision, timestamp) {
        var bodyA = collision.bodyA,
            bodyB = collision.bodyB;

        var pair = {
            id: Pair.id(bodyA, bodyB),
            bodyA: bodyA,
            bodyB: bodyB,
            contacts: {},
            activeContacts: [],
            separation: 0,
            isActive: true,
            timeCreated: timestamp,
            timeUpdated: timestamp,
            inverseMass: bodyA.inverseMass + bodyB.inverseMass,
            friction: Math.min(bodyA.friction, bodyB.friction),
            restitution: Math.max(bodyA.restitution, bodyB.restitution),
            slop: Math.max(bodyA.slop, bodyB.slop)
        };

        Pair.update(pair, collision, timestamp);

        return pair;
    };

    /**
     * Description
     * @method update
     * @param {pair} pair
     * @param {collision} collision
     */
    Pair.update = function(pair, collision, timestamp) {
        var contacts = pair.contacts,
            supports = collision.supports,
            activeContacts = pair.activeContacts;
        
        pair.collision = collision;
        activeContacts.length = 0;
        
        if (collision.collided) {
            for (var i = 0; i < supports.length; i++) {
                var support = supports[i],
                    contactId = Contact.id(support),
                    contact = contacts[contactId];

                if (contact) {
                    activeContacts.push(contact);
                } else {
                    activeContacts.push(contacts[contactId] = Contact.create(support));
                }
            }

            pair.separation = collision.depth;
            Pair.setActive(pair, true, timestamp);
        } else {
            if (pair.isActive === true)
                Pair.setActive(pair, false, timestamp);
        }
    };
    
    /**
     * Description
     * @method setActive
     * @param {pair} pair
     * @param {bool} isActive
     */
    Pair.setActive = function(pair, isActive, timestamp) {
        if (isActive) {
            pair.isActive = true;
            pair.timeUpdated = timestamp;
        } else {
            pair.isActive = false;
            pair.activeContacts.length = 0;
        }
    };

    /**
     * Description
     * @method id
     * @param {body} bodyA
     * @param {body} bodyB
     * @return {number} Unique pairId
     */
    Pair.id = function(bodyA, bodyB) {
        if (bodyA.id < bodyB.id) {
            return bodyA.id + '_' + bodyB.id;
        } else {
            return bodyB.id + '_' + bodyA.id;
        }
    };

})();

;   // End src/collision/Pair.js


// Begin src/collision/Pairs.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Pairs
*/

var Pairs = {};

(function() {
    
    var _pairMaxIdleLife = 1000;

    /**
     * Creates a new pairs structure
     * @method create
     * @param {object} options
     * @return {pairs} A new pairs structure
     */
    Pairs.create = function(options) {
        return Common.extend({ 
            table: {},
            list: [],
            collisionStart: [],
            collisionActive: [],
            collisionEnd: []
        }, options);
    };

    /**
     * Description
     * @method update
     * @param {object} pairs
     * @param {collision[]} collisions
     */
    Pairs.update = function(pairs, collisions, timestamp) {
        var pairsList = pairs.list,
            pairsTable = pairs.table,
            collisionStart = pairs.collisionStart,
            collisionEnd = pairs.collisionEnd,
            collisionActive = pairs.collisionActive,
            activePairIds = [],
            collision,
            pairId,
            pair,
            i;

        // clear collision state arrays, but maintain old reference
        collisionStart.length = 0;
        collisionEnd.length = 0;
        collisionActive.length = 0;

        for (i = 0; i < collisions.length; i++) {
            collision = collisions[i];

            if (collision.collided) {
                pairId = Pair.id(collision.bodyA, collision.bodyB);
                activePairIds.push(pairId);

                pair = pairsTable[pairId];
                
                if (pair) {
                    // pair already exists (but may or may not be active)
                    if (pair.isActive) {
                        // pair exists and is active
                        collisionActive.push(pair);
                    } else {
                        // pair exists but was inactive, so a collision has just started again
                        collisionStart.push(pair);
                    }

                    // update the pair
                    Pair.update(pair, collision, timestamp);
                } else {
                    // pair did not exist, create a new pair
                    pair = Pair.create(collision, timestamp);
                    pairsTable[pairId] = pair;

                    // push the new pair
                    collisionStart.push(pair);
                    pairsList.push(pair);
                }
            }
        }

        // deactivate previously active pairs that are now inactive
        for (i = 0; i < pairsList.length; i++) {
            pair = pairsList[i];
            if (pair.isActive && activePairIds.indexOf(pair.id) === -1) {
                Pair.setActive(pair, false, timestamp);
                collisionEnd.push(pair);
            }
        }
    };
    
    /**
     * Description
     * @method removeOld
     * @param {object} pairs
     */
    Pairs.removeOld = function(pairs, timestamp) {
        var pairsList = pairs.list,
            pairsTable = pairs.table,
            indexesToRemove = [],
            pair,
            collision,
            pairIndex,
            i;

        for (i = 0; i < pairsList.length; i++) {
            pair = pairsList[i];
            collision = pair.collision;
            
            // never remove sleeping pairs
            if (collision.bodyA.isSleeping || collision.bodyB.isSleeping) {
                pair.timeUpdated = timestamp;
                continue;
            }

            // if pair is inactive for too long, mark it to be removed
            if (timestamp - pair.timeUpdated > _pairMaxIdleLife) {
                indexesToRemove.push(i);
            }
        }

        // remove marked pairs
        for (i = 0; i < indexesToRemove.length; i++) {
            pairIndex = indexesToRemove[i] - i;
            pair = pairsList[pairIndex];
            delete pairsTable[pair.id];
            pairsList.splice(pairIndex, 1);
        }
    };

    /**
     * Clears the given pairs structure
     * @method create
     * @param {object} options
     * @param {pairs} pairs
     */
    Pairs.clear = function(pairs) {
        pairs.table = {};
        pairs.list.length = 0;
        pairs.collisionStart.length = 0;
        pairs.collisionActive.length = 0;
        pairs.collisionEnd.length = 0;
        return pairs;
    };

})();

;   // End src/collision/Pairs.js


// Begin src/collision/Query.js

/**
* Functions for performing collision queries
*
* @class Query
*/

var Query = {};

(function() {

    /**
     * Casts a ray segment against a set of bodies and returns all collisions, ray width is optional. Intersection points are not provided.
     * @method ray
     * @param {body[]} bodies
     * @param {vector} startPoint
     * @param {vector} endPoint
     * @return {object[]} Collisions
     */
    Query.ray = function(bodies, startPoint, endPoint, rayWidth) {
        rayWidth = rayWidth || Number.MIN_VALUE;

        var rayAngle = Vector.angle(startPoint, endPoint),
            rayLength = Vector.magnitude(Vector.sub(startPoint, endPoint)),
            rayX = (endPoint.x + startPoint.x) * 0.5,
            rayY = (endPoint.y + startPoint.y) * 0.5,
            ray = Bodies.rectangle(rayX, rayY, rayLength, rayWidth, { angle: rayAngle }),
            collisions = [];

        for (var i = 0; i < bodies.length; i++) {
            var bodyA = bodies[i];

            if (Bounds.overlaps(bodyA.bounds, ray.bounds)) {
                var collision = SAT.collides(bodyA, ray);
                if (collision.collided) {
                    collision.body = collision.bodyA = collision.bodyB = bodyA;
                    collisions.push(collision);
                }
            }
        }

        return collisions;
    };

    /**
     * Returns all bodies whose bounds are inside (or outside if set) the given set of bounds, from the given set of bodies
     * @method region
     * @param {body[]} bodies
     * @param {bounds} bounds
     * @param {bool} outside
     * @return {body[]} The bodies matching the query
     */
    Query.region = function(bodies, bounds, outside) {
        var result = [];

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                overlaps = Bounds.overlaps(body.bounds, bounds);
            if ((overlaps && !outside) || (!overlaps && outside))
                result.push(body);
        }

        return result;
    };

})();

;   // End src/collision/Query.js


// Begin src/collision/Resolver.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Resolver
*/

var Resolver = {};

(function() {

    var _restingThresh = 4,
        _positionDampen = 0.2,
        _positionWarming = 0.6;

    /**
     * Description
     * @method solvePosition
     * @param {pair[]} pairs
     * @param {number} timeScale
     */
    Resolver.solvePosition = function(pairs, timeScale) {
        var i,
            pair,
            collision,
            bodyA,
            bodyB,
            vertex,
            vertexCorrected,
            normal,
            bodyBtoA;

        // find impulses required to resolve penetration
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            
            if (!pair.isActive)
                continue;
            
            collision = pair.collision;
            bodyA = collision.bodyA;
            bodyB = collision.bodyB;
            vertex = collision.supports[0];
            vertexCorrected = collision.supportCorrected;
            normal = collision.normal;

            // get current separation between body edges involved in collision
            bodyBtoA = Vector.sub(Vector.add(bodyB.positionImpulse, vertex), 
                                    Vector.add(bodyA.positionImpulse, vertexCorrected));

            pair.separation = Vector.dot(normal, bodyBtoA);
        }
        
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            
            if (!pair.isActive)
                continue;
            
            collision = pair.collision;
            bodyA = collision.bodyA;
            bodyB = collision.bodyB;
            normal = collision.normal;
            positionImpulse = ((pair.separation * _positionDampen) - pair.slop) * timeScale;
        
            if (bodyA.isStatic || bodyB.isStatic)
                positionImpulse *= 2;
            
            if (!(bodyA.isStatic || bodyA.isSleeping)) {
                bodyA.positionImpulse.x += normal.x * positionImpulse;
                bodyA.positionImpulse.y += normal.y * positionImpulse;
            }

            if (!(bodyB.isStatic || bodyB.isSleeping)) {
                bodyB.positionImpulse.x -= normal.x * positionImpulse;
                bodyB.positionImpulse.y -= normal.y * positionImpulse;
            }
        }
    };

    /**
     * Description
     * @method postSolvePosition
     * @param {body[]} bodies
     */
    Resolver.postSolvePosition = function(bodies) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.positionImpulse.x !== 0 || body.positionImpulse.y !== 0) {
                // move the body without changing velocity
                body.position.x += body.positionImpulse.x;
                body.position.y += body.positionImpulse.y;
                body.positionPrev.x += body.positionImpulse.x;
                body.positionPrev.y += body.positionImpulse.y;

                // update body geometry
                Vertices.translate(body.vertices, body.positionImpulse);
                Bounds.update(body.bounds, body.vertices, body.velocity);
                
                // dampen accumulator to warm the next step
                body.positionImpulse.x *= _positionWarming;
                body.positionImpulse.y *= _positionWarming;
            }
        }
    };

    /**
     * Description
     * @method preSolveVelocity
     * @param {pair[]} pairs
     */
    Resolver.preSolveVelocity = function(pairs) {
        var impulse = {},
            i,
            j,
            pair,
            contacts,
            collision,
            bodyA,
            bodyB,
            normal,
            tangent,
            contact,
            contactVertex,
            normalImpulse,
            tangentImpulse,
            offset;
        
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            
            if (!pair.isActive)
                continue;
            
            contacts = pair.activeContacts;
            collision = pair.collision;
            bodyA = collision.bodyA;
            bodyB = collision.bodyB;
            normal = collision.normal;
            tangent = collision.tangent;
                
            // resolve each contact
            for (j = 0; j < contacts.length; j++) {
                contact = contacts[j];
                contactVertex = contact.vertex;
                normalImpulse = contact.normalImpulse;
                tangentImpulse = contact.tangentImpulse;
                
                // total impulse from contact
                impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
                impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);
                
                // apply impulse from contact
                if (!(bodyA.isStatic || bodyA.isSleeping)) {
                    offset = Vector.sub(contactVertex, bodyA.position);
                    bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
                    bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
                    bodyA.anglePrev += Vector.cross(offset, impulse) * bodyA.inverseInertia;
                }

                if (!(bodyB.isStatic || bodyB.isSleeping)) {
                    offset = Vector.sub(contactVertex, bodyB.position);
                    bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
                    bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
                    bodyB.anglePrev -= Vector.cross(offset, impulse) * bodyB.inverseInertia;
                }
            }
        }
    };

    /**
     * Description
     * @method solveVelocity
     * @param {pair[]} pairs
     */
    Resolver.solveVelocity = function(pairs, timeScale) {
        var impulse = {},
            timeScaleSquared = timeScale * timeScale;
        
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            
            if (!pair.isActive)
                continue;
            
            var collision = pair.collision,
                bodyA = collision.bodyA,
                bodyB = collision.bodyB,
                normal = collision.normal,
                tangent = collision.tangent,
                contacts = pair.activeContacts,
                contactShare = 1 / contacts.length;

            // update body velocities
            bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
            bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
            bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
            bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
            bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
            bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

            // resolve each contact
            for (var j = 0; j < contacts.length; j++) {
                var contact = contacts[j],
                    contactVertex = contact.vertex,
                    offsetA = Vector.sub(contactVertex, bodyA.position),
                    offsetB = Vector.sub(contactVertex, bodyB.position),
                    velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity)),
                    velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity)), 
                    relativeVelocity = Vector.sub(velocityPointA, velocityPointB),
                    normalVelocity = Vector.dot(normal, relativeVelocity);

                var tangentVelocity = Vector.dot(tangent, relativeVelocity),
                    tangentSpeed = Math.abs(tangentVelocity),
                    tangentVelocityDirection = Common.sign(tangentVelocity);

                // raw impulses
                var normalImpulse = (1 + pair.restitution) * normalVelocity,
                    normalForce = Common.clamp(pair.separation + normalVelocity, 0, 1);

                // coulomb friction
                var tangentImpulse = tangentVelocity;
                if (tangentSpeed > normalForce * pair.friction * timeScaleSquared)
                    tangentImpulse = normalForce * pair.friction * timeScaleSquared * tangentVelocityDirection;

                // modify impulses accounting for mass, inertia and offset
                var oAcN = Vector.cross(offsetA, normal),
                    oBcN = Vector.cross(offsetB, normal),
                    share = contactShare / (pair.inverseMass + bodyA.inverseInertia * oAcN * oAcN  + bodyB.inverseInertia * oBcN * oBcN);
                normalImpulse *= share;
                tangentImpulse *= share;
                
                // handle high velocity and resting collisions separately
                if (normalVelocity < 0 && normalVelocity * normalVelocity > _restingThresh * timeScaleSquared) {
                    // high velocity so clear cached contact impulse
                    contact.normalImpulse = 0;
                    contact.tangentImpulse = 0;
                } else {
                    // solve resting collision constraints using Erin Catto's method (GDC08)

                    // impulse constraint, tends to 0
                    var contactNormalImpulse = contact.normalImpulse;
                    contact.normalImpulse = Math.min(contact.normalImpulse + normalImpulse, 0);
                    normalImpulse = contact.normalImpulse - contactNormalImpulse;
                    
                    // tangent impulse, tends to -maxFriction or maxFriction
                    var contactTangentImpulse = contact.tangentImpulse;
                    contact.tangentImpulse = Common.clamp(contact.tangentImpulse + tangentImpulse, -tangentSpeed, tangentSpeed);
                    tangentImpulse = contact.tangentImpulse - contactTangentImpulse;
                }
                
                // total impulse from contact
                impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
                impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);
                
                // apply impulse from contact
                if (!(bodyA.isStatic || bodyA.isSleeping)) {
                    bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
                    bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
                    bodyA.anglePrev += Vector.cross(offsetA, impulse) * bodyA.inverseInertia;
                }

                if (!(bodyB.isStatic || bodyB.isSleeping)) {
                    bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
                    bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
                    bodyB.anglePrev -= Vector.cross(offsetB, impulse) * bodyB.inverseInertia;
                }
            }
        }
    };

})();

;   // End src/collision/Resolver.js


// Begin src/collision/SAT.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class SAT
*/

// TODO: true circles and curves

var SAT = {};

(function() {

    /**
     * Description
     * @method collides
     * @param {body} bodyA
     * @param {body} bodyB
     * @param {collision} previousCollision
     * @return {collision} collision
     */
    SAT.collides = function(bodyA, bodyB, previousCollision) {
        var overlapAB,
            overlapBA, 
            minOverlap,
            collision,
            prevCol = previousCollision,
            canReusePrevCol = false;

        if (prevCol) {
            // estimate total motion
            var motion = bodyA.speed * bodyA.speed + bodyA.angularSpeed * bodyA.angularSpeed
                       + bodyB.speed * bodyB.speed + bodyB.angularSpeed * bodyB.angularSpeed;

            // we may be able to (partially) reuse collision result 
            // but only safe if collision was resting
            canReusePrevCol = prevCol && prevCol.collided && motion < 0.2;

            // reuse collision object
            collision = prevCol;
        } else {
            collision = { collided: false, bodyA: bodyA, bodyB: bodyB };
        }

        if (prevCol && canReusePrevCol) {
            // if we can reuse the collision result
            // we only need to test the previously found axis
            var axes = [prevCol.bodyA.axes[prevCol.axisNumber]];

            minOverlap = _overlapAxes(prevCol.bodyA.vertices, prevCol.bodyB.vertices, axes);
            collision.reused = true;

            if (minOverlap.overlap <= 0) {
                collision.collided = false;
                return collision;
            }
        } else {
            // if we can't reuse a result, perform a full SAT test

            overlapAB = _overlapAxes(bodyA.vertices, bodyB.vertices, bodyA.axes);

            if (overlapAB.overlap <= 0) {
                collision.collided = false;
                return collision;
            }

            overlapBA = _overlapAxes(bodyB.vertices, bodyA.vertices, bodyB.axes);

            if (overlapBA.overlap <= 0) {
                collision.collided = false;
                return collision;
            }

            if (overlapAB.overlap < overlapBA.overlap) {
                minOverlap = overlapAB;
                collision.bodyA = bodyA;
                collision.bodyB = bodyB;
            } else {
                minOverlap = overlapBA;
                collision.bodyA = bodyB;
                collision.bodyB = bodyA;
            }

            // important for reuse later
            collision.axisNumber = minOverlap.axisNumber;
        }

        collision.collided = true;
        collision.normal = minOverlap.axis;
        collision.depth = minOverlap.overlap;
        
        bodyA = collision.bodyA;
        bodyB = collision.bodyB;

        // ensure normal is facing away from bodyA
        if (Vector.dot(collision.normal, Vector.sub(bodyB.position, bodyA.position)) > 0) 
            collision.normal = Vector.neg(collision.normal);

        collision.tangent = Vector.perp(collision.normal);

        collision.penetration = { 
            x: collision.normal.x * collision.depth, 
            y: collision.normal.y * collision.depth 
        };

        // find support points, there is always either exactly one or two
        var verticesB = _findSupports(bodyA, bodyB, collision.normal),
            supports = [verticesB[0]];
        
        if (Vertices.contains(bodyA.vertices, verticesB[1])) {
            supports.push(verticesB[1]);
        } else {
            var verticesA = _findSupports(bodyB, bodyA, Vector.neg(collision.normal));
            
            if (Vertices.contains(bodyB.vertices, verticesA[0])) {
                supports.push(verticesA[0]);
            }

            if (supports.length < 2 && Vertices.contains(bodyB.vertices, verticesA[1])) {
                supports.push(verticesA[1]);
            }
        }
        
        collision.supports = supports;
        collision.supportCorrected = Vector.sub(verticesB[0], collision.penetration);

        return collision;
    };

    /**
     * Description
     * @method _overlapAxes
     * @private
     * @param {} verticesA
     * @param {} verticesB
     * @param {} axes
     * @return result
     */
    var _overlapAxes = function(verticesA, verticesB, axes) {
        var projectionA = {}, 
            projectionB = {},
            result = { overlap: Number.MAX_VALUE },
            overlap,
            axis;

        for (var i = 0; i < axes.length; i++) {
            axis = axes[i];

            _projectToAxis(projectionA, verticesA, axis);
            _projectToAxis(projectionB, verticesB, axis);

            overlap = projectionA.min < projectionB.min 
                        ? projectionA.max - projectionB.min 
                        : projectionB.max - projectionA.min;

            if (overlap <= 0) {
                result.overlap = overlap;
                return result;
            }

            if (overlap < result.overlap) {
                result.overlap = overlap;
                result.axis = axis;
                result.axisNumber = i;
            }
        }

        return result;
    };

    /**
     * Description
     * @method _projectToAxis
     * @private
     * @param {} projection
     * @param {} vertices
     * @param {} axis
     */
    var _projectToAxis = function(projection, vertices, axis) {
        var min = Vector.dot(vertices[0], axis),
            max = min;

        for (var i = 1; i < vertices.length; i += 1) {
            var dot = Vector.dot(vertices[i], axis);

            if (dot > max) { 
                max = dot; 
            } else if (dot < min) { 
                min = dot; 
            }
        }

        projection.min = min;
        projection.max = max;
    };
    
    /**
     * Description
     * @method _findSupports
     * @private
     * @param {} bodyA
     * @param {} bodyB
     * @param {} normal
     * @return ArrayExpression
     */
    var _findSupports = function(bodyA, bodyB, normal) {
        var nearestDistance = Number.MAX_VALUE,
            vertexToBody = { x: 0, y: 0 },
            vertices = bodyB.vertices,
            bodyAPosition = bodyA.position,
            distance,
            vertex,
            vertexA = vertices[0],
            vertexB = vertices[1];

        // find closest vertex on bodyB
        for (var i = 0; i < vertices.length; i++) {
            vertex = vertices[i];
            vertexToBody.x = vertex.x - bodyAPosition.x;
            vertexToBody.y = vertex.y - bodyAPosition.y;
            distance = -Vector.dot(normal, vertexToBody);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                vertexA = vertex;
            }
        }

        // find next closest vertex using the two connected to it
        var prevIndex = vertexA.index - 1 >= 0 ? vertexA.index - 1 : vertices.length - 1;
        vertex = vertices[prevIndex];
        vertexToBody.x = vertex.x - bodyAPosition.x;
        vertexToBody.y = vertex.y - bodyAPosition.y;
        nearestDistance = -Vector.dot(normal, vertexToBody);
        vertexB = vertex;

        var nextIndex = (vertexA.index + 1) % vertices.length;
        vertex = vertices[nextIndex];
        vertexToBody.x = vertex.x - bodyAPosition.x;
        vertexToBody.y = vertex.y - bodyAPosition.y;
        distance = -Vector.dot(normal, vertexToBody);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            vertexB = vertex;
        }

        return [vertexA, vertexB];
    };

})();

;   // End src/collision/SAT.js


// Begin src/constraint/Constraint.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Constraint
*/

// TODO: fix instabillity issues with torque
// TODO: linked constraints
// TODO: breakable constraints
// TODO: collidable constraints
// TODO: allow constrained bodies to sleep
// TODO: handle 0 length constraints properly
// TODO: impulse caching and warming

var Constraint = {};

(function() {

    var _minLength = 0.000001,
        _minDifference = 0.001;

    /**
     * Description
     * @method create
     * @param {} options
     * @return {constraint} constraint
     */
    Constraint.create = function(options) {
        var constraint = options;

        // if bodies defined but no points, use body centre
        if (constraint.bodyA && !constraint.pointA)
            constraint.pointA = { x: 0, y: 0 };
        if (constraint.bodyB && !constraint.pointB)
            constraint.pointB = { x: 0, y: 0 };

        // calculate static length using initial world space points
        var initialPointA = constraint.bodyA ? Vector.add(constraint.bodyA.position, constraint.pointA) : constraint.pointA,
            initialPointB = constraint.bodyB ? Vector.add(constraint.bodyB.position, constraint.pointB) : constraint.pointB,
            length = Vector.magnitude(Vector.sub(initialPointA, initialPointB));
    
        constraint.length = constraint.length || length || _minLength;

        // render
        var render = {
            visible: true,
            lineWidth: 2,
            strokeStyle: '#666'
        };
        
        constraint.render = Common.extend(render, constraint.render);

        // option defaults
        constraint.id = constraint.id || Common.nextId();
        constraint.label = constraint.label || 'Constraint';
        constraint.type = 'constraint';
        constraint.stiffness = constraint.stiffness || 1;
        constraint.angularStiffness = constraint.angularStiffness || 0;
        constraint.angleA = constraint.bodyA ? constraint.bodyA.angle : constraint.angleA;
        constraint.angleB = constraint.bodyB ? constraint.bodyB.angle : constraint.angleB;

        return constraint;
    };

    /**
     * Description
     * @method solveAll
     * @param {constraint[]} constraints
     * @param {number} timeScale
     */
    Constraint.solveAll = function(constraints, timeScale) {
        for (var i = 0; i < constraints.length; i++) {
            Constraint.solve(constraints[i], timeScale);
        }
    };

    /**
     * Description
     * @method solve
     * @param {constraint} constraint
     * @param {number} timeScale
     */
    Constraint.solve = function(constraint, timeScale) {
        var bodyA = constraint.bodyA,
            bodyB = constraint.bodyB,
            pointA = constraint.pointA,
            pointB = constraint.pointB;

        // update reference angle
        if (bodyA && !bodyA.isStatic) {
            constraint.pointA = Vector.rotate(pointA, bodyA.angle - constraint.angleA);
            constraint.angleA = bodyA.angle;
        }
        
        // update reference angle
        if (bodyB && !bodyB.isStatic) {
            constraint.pointB = Vector.rotate(pointB, bodyB.angle - constraint.angleB);
            constraint.angleB = bodyB.angle;
        }

        var pointAWorld = pointA,
            pointBWorld = pointB;

        if (bodyA) pointAWorld = Vector.add(bodyA.position, pointA);
        if (bodyB) pointBWorld = Vector.add(bodyB.position, pointB);

        if (!pointAWorld || !pointBWorld)
            return;

        var delta = Vector.sub(pointAWorld, pointBWorld),
            currentLength = Vector.magnitude(delta);

        // prevent singularity
        if (currentLength === 0)
            currentLength = _minLength;

        // solve distance constraint with Gauss-Siedel method
        var difference = (currentLength - constraint.length) / currentLength,
            normal = Vector.div(delta, currentLength),
            force = Vector.mult(delta, difference * 0.5 * constraint.stiffness * timeScale * timeScale);
        
        // if difference is very small, we can skip
        if (Math.abs(1 - (currentLength / constraint.length)) < _minDifference * timeScale)
            return;

        var velocityPointA,
            velocityPointB,
            offsetA,
            offsetB,
            oAn,
            oBn,
            bodyADenom,
            bodyBDenom;
    
        if (bodyA && !bodyA.isStatic) {
            // point body offset
            offsetA = { 
                x: pointAWorld.x - bodyA.position.x + force.x, 
                y: pointAWorld.y - bodyA.position.y + force.y
            };
            
            // update velocity
            bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
            bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
            bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
            
            // find point velocity and body mass
            velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity));
            oAn = Vector.dot(offsetA, normal);
            bodyADenom = bodyA.inverseMass + bodyA.inverseInertia * oAn * oAn;
        } else {
            velocityPointA = { x: 0, y: 0 };
            bodyADenom = bodyA ? bodyA.inverseMass : 0;
        }
            
        if (bodyB && !bodyB.isStatic) {
            // point body offset
            offsetB = { 
                x: pointBWorld.x - bodyB.position.x - force.x, 
                y: pointBWorld.y - bodyB.position.y - force.y 
            };
            
            // update velocity
            bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
            bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
            bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

            // find point velocity and body mass
            velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity));
            oBn = Vector.dot(offsetB, normal);
            bodyBDenom = bodyB.inverseMass + bodyB.inverseInertia * oBn * oBn;
        } else {
            velocityPointB = { x: 0, y: 0 };
            bodyBDenom = bodyB ? bodyB.inverseMass : 0;
        }
        
        var relativeVelocity = Vector.sub(velocityPointB, velocityPointA),
            normalImpulse = Vector.dot(normal, relativeVelocity) / (bodyADenom + bodyBDenom);
    
        if (normalImpulse > 0) normalImpulse = 0;
    
        var normalVelocity = {
            x: normal.x * normalImpulse, 
            y: normal.y * normalImpulse
        };

        var torque;
 
        if (bodyA && !bodyA.isStatic) {
            torque = Vector.cross(offsetA, normalVelocity) * bodyA.inverseInertia * (1 - constraint.angularStiffness);

            Sleeping.set(bodyA, false);
            
            // clamp to prevent instabillity
            // TODO: solve this properlly
            torque = Common.clamp(torque, -0.01, 0.01);

            // keep track of applied impulses for post solving
            bodyA.constraintImpulse.x -= force.x;
            bodyA.constraintImpulse.y -= force.y;
            bodyA.constraintImpulse.angle += torque;

            // apply forces
            bodyA.position.x -= force.x;
            bodyA.position.y -= force.y;
            bodyA.angle += torque;
        }

        if (bodyB && !bodyB.isStatic) {
            torque = Vector.cross(offsetB, normalVelocity) * bodyB.inverseInertia * (1 - constraint.angularStiffness);

            Sleeping.set(bodyB, false);
            
            // clamp to prevent instabillity
            // TODO: solve this properlly
            torque = Common.clamp(torque, -0.01, 0.01);

            // keep track of applied impulses for post solving
            bodyB.constraintImpulse.x += force.x;
            bodyB.constraintImpulse.y += force.y;
            bodyB.constraintImpulse.angle -= torque;
            
            // apply forces
            bodyB.position.x += force.x;
            bodyB.position.y += force.y;
            bodyB.angle -= torque;
        }

    };

    /**
     * Performs body updates required after solving constraints
     * @method postSolveAll
     * @param {body[]} bodies
     */
    Constraint.postSolveAll = function(bodies) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                impulse = body.constraintImpulse;

            // update geometry and reset
            Vertices.translate(body.vertices, impulse);

            if (impulse.angle !== 0) {
                Vertices.rotate(body.vertices, impulse.angle, body.position);
                Axes.rotate(body.axes, impulse.angle);
                impulse.angle = 0;
            }

            Bounds.update(body.bounds, body.vertices);

            impulse.x = 0;
            impulse.y = 0;
        }
    };

})();

;   // End src/constraint/Constraint.js


// Begin src/constraint/MouseConstraint.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class MouseConstraint
*/

var MouseConstraint = {};

(function() {

    /**
     * Description
     * @method create
     * @param {engine} engine
     * @param {} options
     * @return {MouseConstraint} A new MouseConstraint
     */
    MouseConstraint.create = function(engine, options) {
        var mouse = engine.input.mouse;

        var constraint = Constraint.create({ 
            label: 'Mouse Constraint',
            pointA: mouse.position,
            pointB: { x: 0, y: 0 },
            length: 0.01, 
            stiffness: 0.1,
            angularStiffness: 1,
            render: {
                strokeStyle: '#90EE90',
                lineWidth: 3
            }
        });

        var defaults = {
            type: 'mouseConstraint',
            mouse: mouse,
            dragBody: null,
            dragPoint: null,
            constraint: constraint
        };

        var mouseConstraint = Common.extend(defaults, options);

        Events.on(engine, 'tick', function(event) {
            var allBodies = Composite.allBodies(engine.world);
            MouseConstraint.update(mouseConstraint, allBodies);
        });

        return mouseConstraint;
    };

    /**
     * Description
     * @method update
     * @param {MouseConstraint} mouseConstraint
     * @param {body[]} bodies
     */
    MouseConstraint.update = function(mouseConstraint, bodies) {
        var mouse = mouseConstraint.mouse,
            constraint = mouseConstraint.constraint;

        if (mouse.button === 0) {
            if (!constraint.bodyB) {
                for (var i = 0; i < bodies.length; i++) {
                    var body = bodies[i];
                    if (Bounds.contains(body.bounds, mouse.position) 
                            && Vertices.contains(body.vertices, mouse.position)) {
                        constraint.pointA = mouse.position;
                        constraint.bodyB = body;
                        constraint.pointB = { x: mouse.position.x - body.position.x, y: mouse.position.y - body.position.y };
                        constraint.angleB = body.angle;
                        Sleeping.set(body, false);
                    }
                }
            }
        } else {
            constraint.bodyB = null;
            constraint.pointB = null;
        }

        if (constraint.bodyB) {
            Sleeping.set(constraint.bodyB, false);
            constraint.pointA = mouse.position;
        }
    };

})();

;   // End src/constraint/MouseConstraint.js


// Begin src/core/Common.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Common
*/

var Common = {};

(function() {

    Common._nextId = 0;

    /**
     * Description
     * @method extend
     * @param {} obj
     * @param {boolean} deep
     * @return {} obj extended
     */
    Common.extend = function(obj, deep) {
        var argsStart,
            args,
            deepClone;

        if (typeof deep === 'boolean') {
            argsStart = 2;
            deepClone = deep;
        } else {
            argsStart = 1;
            deepClone = true;
        }

        args = Array.prototype.slice.call(arguments, argsStart);

        for (var i = 0; i < args.length; i++) {
            var source = args[i];

            if (source) {
                for (var prop in source) {
                    if (deepClone && source[prop] && source[prop].constructor === Object) {
                        if (!obj[prop] || obj[prop].constructor === Object) {
                            obj[prop] = obj[prop] || {};
                            Common.extend(obj[prop], deepClone, source[prop]);
                        } else {
                            obj[prop] = source[prop];
                        }
                    } else {
                        obj[prop] = source[prop];
                    }
                }
            }
        }
        
        return obj;
    };

    /**
     * Creates a new clone of the object, if deep is true references will also be cloned
     * @method clone
     * @param {} obj
     * @param {bool} deep
     * @return {} obj cloned
     */
    Common.clone = function(obj, deep) {
        return Common.extend({}, deep, obj);
    };

    /**
     * Description
     * @method keys
     * @param {} obj
     * @return {string[]} keys
     */
    Common.keys = function(obj) {
        if (Object.keys)
            return Object.keys(obj);

        // avoid hasOwnProperty for performance
        var keys = [];
        for (var key in obj)
            keys.push(key);
        return keys;
    };

    /**
     * Description
     * @method values
     * @param {} obj
     * @return {array} Array of the objects property values
     */
    Common.values = function(obj) {
        var values = [];
        
        if (Object.keys) {
            var keys = Object.keys(obj);
            for (var i = 0; i < keys.length; i++) {
                values.push(obj[keys[i]]);
            }
            return values;
        }
        
        // avoid hasOwnProperty for performance
        for (var key in obj)
            values.push(obj[key]);
        return values;
    };

    /**
     * Description
     * @method shadeColor
     * @param {string} color
     * @param {number} percent
     * @return {string} A hex colour string made by lightening or darkening color by percent
     */
    Common.shadeColor = function(color, percent) {   
        // http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color
        var colorInteger = parseInt(color.slice(1),16), 
            amount = Math.round(2.55 * percent), 
            R = (colorInteger >> 16) + amount, 
            B = (colorInteger >> 8 & 0x00FF) + amount, 
            G = (colorInteger & 0x0000FF) + amount;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R :255) * 0x10000 
                + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 
                + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
    };

    /**
     * Description
     * @method shuffle
     * @param {array} array
     * @return {array} array shuffled randomly
     */
    Common.shuffle = function(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    };

    /**
     * Description
     * @method choose
     * @param {array} choices
     * @return {object} A random choice object from the array
     */
    Common.choose = function(choices) {
        return choices[Math.floor(Math.random() * choices.length)];
    };

    /**
     * Description
     * @method isElement
     * @param {object} obj
     * @return {boolean} True if the object is a HTMLElement, otherwise false
     */
    Common.isElement = function(obj) {
        // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
        try {
            return obj instanceof HTMLElement;
        }
        catch(e){
            return (typeof obj==="object") &&
              (obj.nodeType===1) && (typeof obj.style === "object") &&
              (typeof obj.ownerDocument ==="object");
        }
    };
    
    /**
     * Description
     * @method clamp
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @return {number} The value clamped between min and max inclusive
     */
    Common.clamp = function(value, min, max) {
        if (value < min)
            return min;
        if (value > max)
            return max;
        return value;
    };
    
    /**
     * Description
     * @method sign
     * @param {number} value
     * @return {number} -1 if negative, +1 if 0 or positive
     */
    Common.sign = function(value) {
        return value < 0 ? -1 : 1;
    };
    
    /**
     * Description
     * @method now
     * @return {number} the current timestamp (high-res if avaliable)
     */
    Common.now = function() {
        // http://stackoverflow.com/questions/221294/how-do-you-get-a-timestamp-in-javascript
        // https://gist.github.com/davidwaterston/2982531
        
        var perf = window.performance;

        if (perf) {
            perf.now = perf.now || perf.webkitNow || perf.msNow || perf.oNow || perf.mozNow;
            return +(perf.now());
        }
        
        return +(new Date());
    };

    
    /**
     * Description
     * @method random
     * @param {number} min
     * @param {number} max
     * @return {number} A random number between min and max inclusive
     */
    Common.random = function(min, max) {
        return min + Math.random() * (max - min);
    };

    /**
     * Converts a CSS hex colour string into an integer
     * @method colorToNumber
     * @param {string} colorString
     * @return {number} An integer representing the CSS hex string
     */
    Common.colorToNumber = function(colorString) {
        colorString = colorString.replace('#','');

        if (colorString.length == 3) {
            colorString = colorString.charAt(0) + colorString.charAt(0)
                        + colorString.charAt(1) + colorString.charAt(1)
                        + colorString.charAt(2) + colorString.charAt(2);
        }

        return parseInt(colorString, 16);
    };

    /**
     * A wrapper for console.log, for providing errors and warnings
     * @method log
     * @param {string} message
     * @param {string} type
     */
    Common.log = function(message, type) {
        if (!console || !console.log)
            return;

        var style;

        switch (type) {

        case 'warn':
            style = 'color: coral';
            break;
        case 'error':
            style = 'color: red';
            break;

        }

        console.log('%c [Matter] ' + type + ': ' + message, style);
    };

    /**
     * Returns the next unique sequential ID
     * @method nextId
     * @return {Number} Unique sequential ID
     */
    Common.nextId = function() {
        return Common._nextId++;
    };

})();

;   // End src/core/Common.js


// Begin src/core/Engine.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Engine
*/

// TODO: viewports

var Engine = {};

(function() {

    var _fps = 60,
        _deltaSampleSize = _fps,
        _delta = 1000 / _fps;
        
    var _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
                                      || window.mozRequestAnimationFrame || window.msRequestAnimationFrame 
                                      || function(callback){ window.setTimeout(function() { callback(Common.now()); }, _delta); };
   
    /**
     * Description
     * @method create
     * @param {HTMLElement} element
     * @param {object} options
     * @return {engine} engine
     */
    Engine.create = function(element, options) {

        // options may be passed as the first (and only) argument
        options = Common.isElement(element) ? options : element;
        element = Common.isElement(element) ? element : null;

        var defaults = {
            enabled: true,
            positionIterations: 6,
            velocityIterations: 4,
            constraintIterations: 2,
            enableSleeping: false,
            timeScale: 1,
            input: {},
            events: [],
            timing: {
                fps: _fps,
                timestamp: 0,
                delta: _delta,
                correction: 1,
                deltaMin: 1000 / _fps,
                deltaMax: 1000 / (_fps * 0.5),
                timeScale: 1,
                isFixed: false
            },
            render: {
                element: element,
                controller: RenderPixi
            }
        };
        
        var engine = Common.extend(defaults, options);

        engine.render = engine.render.controller.create(engine.render);
        engine.world = World.create(engine.world);
        engine.pairs = Pairs.create();
        engine.metrics = engine.metrics || Metrics.create();
        engine.input.mouse = engine.input.mouse || Mouse.create(engine.render.canvas);
        engine.input.keyboard = engine.input.keyboard || Keyboard.create(engine.render.canvas);

        engine.broadphase = engine.broadphase || {
            current: 'grid',
            grid: {
                controller: Grid,
                instance: Grid.create(),
                detector: Detector.collisions
            },
            bruteForce: {
                detector: Detector.bruteForce
            }
        };

        return engine;
    };

    /**
     * An optional utility function that provides a game loop, that handles updating the engine for you.
     * Calls `Engine.update` and `Engine.render` on the `requestAnimationFrame` event automatically.
     * Handles time correction and non-fixed dynamic timing (if enabled). 
     * Triggers `beforeTick`, `tick` and `afterTick` events.
     * @method run
     * @param {engine} engine
     */
    Engine.run = function(engine) {
        var counterTimestamp = 0,
            frameCounter = 0,
            deltaHistory = [],
            timePrev,
            timeScalePrev = 1;

        (function render(time){
            _requestAnimationFrame(render);

            if (!engine.enabled)
                return;

            var timing = engine.timing,
                delta,
                correction;

            // create an event object
            var event = {
                timestamp: time
            };

            Events.trigger(engine, 'beforeTick', event);

            if (timing.isFixed) {
                // fixed timestep
                delta = timing.delta;
            } else {
                // dynamic timestep based on wall clock between calls
                delta = (time - timePrev) || timing.delta;
                timePrev = time;

                // optimistically filter delta over a few frames, to improve stability
                deltaHistory.push(delta);
                deltaHistory = deltaHistory.slice(-_deltaSampleSize);
                delta = Math.min.apply(null, deltaHistory);
                
                // limit delta
                delta = delta < timing.deltaMin ? timing.deltaMin : delta;
                delta = delta > timing.deltaMax ? timing.deltaMax : delta;

                // time correction for delta
                correction = delta / timing.delta;

                // update engine timing object
                timing.delta = delta;
            }

            // time correction for time scaling
            if (timeScalePrev !== 0)
                correction *= timing.timeScale / timeScalePrev;

            if (timing.timeScale === 0)
                correction = 0;

            timeScalePrev = timing.timeScale;
            
            // fps counter
            frameCounter += 1;
            if (time - counterTimestamp >= 1000) {
                timing.fps = frameCounter * ((time - counterTimestamp) / 1000);
                counterTimestamp = time;
                frameCounter = 0;
            }

            Events.trigger(engine, 'tick', event);

            // if world has been modified, clear the render scene graph
            if (engine.world.isModified)
                engine.render.controller.clear(engine.render);

            // update
            Engine.update(engine, delta, correction);

            // trigger events that may have occured during the step
            _triggerCollisionEvents(engine);
            _triggerMouseEvents(engine);
            _triggerKeyboardEvents(engine);

            // render
            Engine.render(engine);

            Events.trigger(engine, 'afterTick', event);
        })();
    };

    /**
     * Moves the simulation forward in time by `delta` ms. Triggers `beforeUpdate` and `afterUpdate` events.
     * @method update
     * @param {engine} engine
     * @param {number} delta
     * @param {number} correction
     * @return engine
     */
    Engine.update = function(engine, delta, correction) {
        correction = (typeof correction !== 'undefined') ? correction : 1;

        var world = engine.world,
            timing = engine.timing,
            broadphase = engine.broadphase[engine.broadphase.current],
            broadphasePairs = [],
            i;

        // increment timestamp
        timing.timestamp += delta * timing.timeScale;
        timing.correction = correction;

        // create an event object
        var event = {
            timestamp: engine.timing.timestamp
        };

        Events.trigger(engine, 'beforeUpdate', event);

        // get lists of all bodies and constraints, no matter what composites they are in
        var allBodies = Composite.allBodies(world),
            allConstraints = Composite.allConstraints(world);

        // reset metrics logging
        Metrics.reset(engine.metrics);

        // if sleeping enabled, call the sleeping controller
        if (engine.enableSleeping)
            Sleeping.update(allBodies);

        // applies gravity to all bodies
        Body.applyGravityAll(allBodies, world.gravity);

        // update all body position and rotation by integration
        Body.updateAll(allBodies, delta, timing.timeScale, correction, world.bounds);

        // update all constraints
        for (i = 0; i < engine.constraintIterations; i++) {
            Constraint.solveAll(allConstraints, timing.timeScale);
        }
        Constraint.postSolveAll(allBodies);

        // broadphase pass: find potential collision pairs
        if (broadphase.controller) {

            // if world is dirty, we must flush the whole grid
            if (world.isModified)
                broadphase.controller.clear(broadphase.instance);

            // update the grid buckets based on current bodies
            broadphase.controller.update(broadphase.instance, allBodies, engine, world.isModified);
            broadphasePairs = broadphase.instance.pairsList;
        } else {

            // if no broadphase set, we just pass all bodies
            broadphasePairs = allBodies;
        }

        // narrowphase pass: find actual collisions, then create or update collision pairs
        var collisions = broadphase.detector(broadphasePairs, engine);

        // update collision pairs
        var pairs = engine.pairs,
            timestamp = timing.timestamp;
        Pairs.update(pairs, collisions, timestamp);
        Pairs.removeOld(pairs, timestamp);

        // wake up bodies involved in collisions
        if (engine.enableSleeping)
            Sleeping.afterCollisions(pairs.list);

        // iteratively resolve velocity between collisions
        Resolver.preSolveVelocity(pairs.list);
        for (i = 0; i < engine.velocityIterations; i++) {
            Resolver.solveVelocity(pairs.list, timing.timeScale);
        }
        
        // iteratively resolve position between collisions
        for (i = 0; i < engine.positionIterations; i++) {
            Resolver.solvePosition(pairs.list, timing.timeScale);
        }
        Resolver.postSolvePosition(allBodies);

        // update metrics log
        Metrics.update(engine.metrics, engine);

        // clear force buffers
        Body.resetForcesAll(allBodies);

        // clear all composite modified flags
        if (world.isModified)
            Composite.setModified(world, false, false, true);

        Events.trigger(engine, 'afterUpdate', event);

        return engine;
    };

    /**
     * Renders the world by calling its defined renderer `engine.render.controller`. Triggers `beforeRender` and `afterRender` events.
     * @method render
     * @param {engine} engineA
     * @param {engine} engineB
     */
    Engine.render = function(engine) {
        // create an event object
        var event = {
            timestamp: engine.timing.timestamp
        };

        Events.trigger(engine, 'beforeRender', event);
        engine.render.controller.world(engine);
        Events.trigger(engine, 'afterRender', event);
    };
    
    /**
     * Description
     * @method merge
     * @param {engine} engineA
     * @param {engine} engineB
     */
    Engine.merge = function(engineA, engineB) {
        Common.extend(engineA, engineB);
        
        if (engineB.world) {
            engineA.world = engineB.world;

            Engine.clear(engineA);

            var bodies = Composite.allBodies(engineA.world);

            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i];
                Sleeping.set(body, false);
                body.id = Common.nextId();
            }
        }
    };

    /**
     * Description
     * @method clear
     * @param {engine} engine
     */
    Engine.clear = function(engine) {
        var world = engine.world;
        
        Pairs.clear(engine.pairs);

        var broadphase = engine.broadphase[engine.broadphase.current];
        if (broadphase.controller) {
            var bodies = Composite.allBodies(world);
            broadphase.controller.clear(broadphase.instance);
            broadphase.controller.update(broadphase.instance, bodies, engine, true);
        }
    };

    /**
     * Triggers mouse events
     * @method _triggerMouseEvents
     * @private
     * @param {engine} engine
     */
    var _triggerMouseEvents = function(engine) {
        var mouse = engine.input.mouse,
            mouseEvents = mouse.sourceEvents;

        if (mouseEvents.mousemove) {
            Events.trigger(engine, 'mousemove', {
                mouse: mouse
            });
        }

        if (mouseEvents.mousedown) {
            Events.trigger(engine, 'mousedown', {
                mouse: mouse
            });
        }

        if (mouseEvents.mouseup) {
            Events.trigger(engine, 'mouseup', {
                mouse: mouse
            });
        }

        // reset the mouse state ready for the next step
        Mouse.clearSourceEvents(mouse);
    };

    /**
     * Triggers mouse events
     * @method _triggerKeyboardEvents
     * @private
     * @param {engine} engine
     */
    var _triggerKeyboardEvents = function(engine) {
        var keyboard = engine.input.keyboard,
            keyboardEvents = keyboard.sourceEvents;

        if (keyboardEvents.keydown) {
            Events.trigger(engine, 'keydown', {
                keyboard: keyboard
            });
        }

        if (keyboardEvents.keypress) {
            Events.trigger(engine, 'keypress', {
                keyboard: keyboard
            });
        }

        if (keyboardEvents.keyup) {
            Events.trigger(engine, 'keyup', {
                keyboard: keyboard
            });
        }

        // reset the keyboard state ready for the next step
        Keyboard.clearSourceEvents(keyboard);
    };

    /**
     * Triggers collision events
     * @method _triggerCollisionEvents
     * @private
     * @param {engine} engine
     */
    var _triggerCollisionEvents = function(engine) {
        var pairs = engine.pairs;

        if (pairs.collisionStart.length > 0) {
            Events.trigger(engine, 'collisionStart', {
                pairs: pairs.collisionStart
            });
        }

        if (pairs.collisionActive.length > 0) {
            Events.trigger(engine, 'collisionActive', {
                pairs: pairs.collisionActive
            });
        }

        if (pairs.collisionEnd.length > 0) {
            Events.trigger(engine, 'collisionEnd', {
                pairs: pairs.collisionEnd
            });
        }
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired at the start of a tick, before any updates to the engine or timing
    *
    * @event beforeTick
    * @param {} event An event object
    * @param {DOMHighResTimeStamp} event.timestamp The timestamp of the current tick
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine timing updated, but just before engine state updated
    *
    * @event tick
    * @param {} event An event object
    * @param {DOMHighResTimeStamp} event.timestamp The timestamp of the current tick
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired just before an update
    *
    * @event beforeUpdate
    * @param {} event An event object
    * @param {DOMHighResTimeStamp} event.timestamp The timestamp of the current tick
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update and all collision events
    *
    * @event afterUpdate
    * @param {} event An event object
    * @param {DOMHighResTimeStamp} event.timestamp The timestamp of the current tick
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired just before rendering
    *
    * @event beforeRender
    * @param {} event An event object
    * @param {DOMHighResTimeStamp} event.timestamp The timestamp of the current tick
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after rendering
    *
    * @event afterRender
    * @param {} event An event object
    * @param {DOMHighResTimeStamp} event.timestamp The timestamp of the current tick
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update and after rendering
    *
    * @event afterTick
    * @param {} event An event object
    * @param {DOMHighResTimeStamp} event.timestamp The timestamp of the current tick
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the mouse has moved (or a touch moves) during the last step
    *
    * @event mousemove
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the mouse is down (or a touch has started) during the last step
    *
    * @event mousedown
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the mouse is up (or a touch has ended) during the last step
    *
    * @event mouseup
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that have started to collide in the current tick (if any)
    *
    * @event collisionStart
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {DOMHighResTimeStamp} event.timestamp The timestamp of the current tick
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that are colliding in the current tick (if any)
    *
    * @event collisionActive
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {DOMHighResTimeStamp} event.timestamp The timestamp of the current tick
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that have ended collision in the current tick (if any)
    *
    * @event collisionEnd
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {DOMHighResTimeStamp} event.timestamp The timestamp of the current tick
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

})();

;   // End src/core/Engine.js


// Begin src/core/Events.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Events
*/

var Events = {};

(function() {

    /**
     * Subscribes a callback function to the given object's eventName
     * @method on
     * @param {} object
     * @param {string} eventNames
     * @param {function} callback
     */
    Events.on = function(object, eventNames, callback) {
        var names = eventNames.split(' '),
            name;

        for (var i = 0; i < names.length; i++) {
            name = names[i];
            object.events = object.events || {};
            object.events[name] = object.events[name] || [];
            object.events[name].push(callback);
        }

        return callback;
    };

    /**
     * Removes the given event callback. If no callback, clears all callbacks in eventNames. If no eventNames, clears all events.
     * @method off
     * @param {} object
     * @param {string} eventNames
     * @param {function} callback
     */
    Events.off = function(object, eventNames, callback) {
        if (!eventNames) {
            object.events = {};
            return;
        }

        // handle Events.off(object, callback)
        if (typeof eventNames === 'function') {
            callback = eventNames;
            eventNames = Common.keys(object.events).join(' ');
        }

        var names = eventNames.split(' ');

        for (var i = 0; i < names.length; i++) {
            var callbacks = object.events[names[i]],
                newCallbacks = [];

            if (callback) {
                for (var j = 0; j < callbacks.length; j++) {
                    if (callbacks[j] !== callback)
                        newCallbacks.push(callbacks[j]);
                }
            }

            object.events[names[i]] = newCallbacks;
        }
    };

    /**
     * Fires all the callbacks subscribed to the given object's eventName, in the order they subscribed, if any
     * @method trigger
     * @param {} object
     * @param {string} eventNames
     * @param {} event
     */
    Events.trigger = function(object, eventNames, event) {
        var names,
            name,
            callbacks,
            eventClone;

        if (object.events) {
            if (!event)
                event = {};

            names = eventNames.split(' ');

            for (var i = 0; i < names.length; i++) {
                name = names[i];
                callbacks = object.events[name];

                if (callbacks) {
                    eventClone = Common.clone(event, false);
                    eventClone.name = name;
                    eventClone.source = object;

                    for (var j = 0; j < callbacks.length; j++) {
                        callbacks[j].apply(object, [eventClone]);
                    }
                }
            }
        }
    };

})();

;   // End src/core/Events.js


// Begin src/core/Metrics.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Metrics
*/

var Metrics = {};

(function() {

    /**
     * Description
     * @method create
     * @return {metrics} A new metrics
     */
    Metrics.create = function() {
        return {
            extended: false,
            narrowDetections: 0,
            narrowphaseTests: 0,
            narrowReuse: 0,
            narrowReuseCount: 0,
            midphaseTests: 0,
            broadphaseTests: 0,
            narrowEff: 0.0001,
            midEff: 0.0001,
            broadEff: 0.0001,
            collisions: 0,
            buckets: 0,
            bodies: 0,
            pairs: 0
        };
    };

    /**
     * Description
     * @method reset
     * @param {metrics} metrics
     */
    Metrics.reset = function(metrics) {
        if (metrics.extended) {
            metrics.narrowDetections = 0;
            metrics.narrowphaseTests = 0;
            metrics.narrowReuse = 0;
            metrics.narrowReuseCount = 0;
            metrics.midphaseTests = 0;
            metrics.broadphaseTests = 0;
            metrics.narrowEff = 0;
            metrics.midEff = 0;
            metrics.broadEff = 0;
            metrics.collisions = 0;
            metrics.buckets = 0;
            metrics.pairs = 0;
            metrics.bodies = 0;
        }
    };

    /**
     * Description
     * @method update
     * @param {metrics} metrics
     * @param {engine} engine
     */
    Metrics.update = function(metrics, engine) {
        if (metrics.extended) {
            var world = engine.world,
                broadphase = engine.broadphase[engine.broadphase.current],
                bodies = Composite.allBodies(world);

            metrics.collisions = metrics.narrowDetections;
            metrics.pairs = engine.pairs.list.length;
            metrics.bodies = bodies.length;
            metrics.midEff = (metrics.narrowDetections / (metrics.midphaseTests || 1)).toFixed(2);
            metrics.narrowEff = (metrics.narrowDetections / (metrics.narrowphaseTests || 1)).toFixed(2);
            metrics.broadEff = (1 - (metrics.broadphaseTests / (bodies.length || 1))).toFixed(2);
            metrics.narrowReuse = (metrics.narrowReuseCount / (metrics.narrowphaseTests || 1)).toFixed(2);
            //if (broadphase.instance)
            //    metrics.buckets = Common.keys(broadphase.instance.buckets).length;
        }
    };

})();

;   // End src/core/Metrics.js


// Begin src/core/Mouse.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Mouse
*/

var Mouse;

(function() {
    
    /**
     * Description
     * @param {HTMLElement} element
     */
    Mouse = function(element) {
        var mouse = this;
        
        this.element = element || document.body;
        this.absolute = { x: 0, y: 0 };
        this.position = { x: 0, y: 0 };
        this.mousedownPosition = { x: 0, y: 0 };
        this.mouseupPosition = { x: 0, y: 0 };
        this.offset = { x: 0, y: 0 };
        this.scale = { x: 1, y: 1 };
        this.wheelDelta = 0;
        this.button = -1;

        this.sourceEvents = {
            mousemove: null,
            mousedown: null,
            mouseup: null,
            mousewheel: null
        };
        
        this.mousemove = function(event) { 
            var position = _getRelativeMousePosition(event, mouse.element),
                touches = event.changedTouches;

            if (touches) {
                mouse.button = 0;
                event.preventDefault();
            }

            mouse.absolute.x = position.x;
            mouse.absolute.y = position.y;
            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
            mouse.sourceEvents.mousemove = event;
        };
        
        this.mousedown = function(event) {
            var position = _getRelativeMousePosition(event, mouse.element),
                touches = event.changedTouches;

            if (touches) {
                mouse.button = 0;
                event.preventDefault();
            } else {
                mouse.button = event.button;
            }

            mouse.absolute.x = position.x;
            mouse.absolute.y = position.y;
            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
            mouse.mousedownPosition.x = mouse.position.x;
            mouse.mousedownPosition.y = mouse.position.y;
            mouse.sourceEvents.mousedown = event;
        };
        
        this.mouseup = function(event) {
            var position = _getRelativeMousePosition(event, mouse.element),
                touches = event.changedTouches;

            if (touches) {
                event.preventDefault();
            }
            
            mouse.button = -1;
            mouse.absolute.x = position.x;
            mouse.absolute.y = position.y;
            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
            mouse.mouseupPosition.x = mouse.position.x;
            mouse.mouseupPosition.y = mouse.position.y;
            mouse.sourceEvents.mouseup = event;
        };

        this.mousewheel = function(event) {
            mouse.wheelDelta = Math.max(-1, Math.min(1, event.wheelDelta || -event.detail));
            event.preventDefault();
        };

        Mouse.setElement(mouse, mouse.element);
    };

    /**
     * Description
     * @method create
     * @param {HTMLElement} element
     * @return {mouse} A new mouse
     */
    Mouse.create = function(element) {
        return new Mouse(element);
    };

    /**
     * Sets the element the mouse is bound to (and relative to)
     * @method setElement
     * @param {mouse} mouse
     * @param {HTMLElement} element
     */
    Mouse.setElement = function(mouse, element) {
        mouse.element = element;

        element.addEventListener('mousemove', mouse.mousemove);
        element.addEventListener('mousedown', mouse.mousedown);
        element.addEventListener('mouseup', mouse.mouseup);
        
        element.addEventListener("mousewheel", mouse.mousewheel);
        element.addEventListener("DOMMouseScroll", mouse.mousewheel);

        element.addEventListener('touchmove', mouse.mousemove);
        element.addEventListener('touchstart', mouse.mousedown);
        element.addEventListener('touchend', mouse.mouseup);
    };

    /**
     * Clears all captured source events
     * @method clearSourceEvents
     * @param {mouse} mouse
     */
    Mouse.clearSourceEvents = function(mouse) {
        mouse.sourceEvents.mousemove = null;
        mouse.sourceEvents.mousedown = null;
        mouse.sourceEvents.mouseup = null;
        mouse.sourceEvents.mousewheel = null;
        mouse.wheelDelta = 0;
    };

    /**
     * Sets the offset
     * @method setOffset
     * @param {mouse} mouse
     */
    Mouse.setOffset = function(mouse, offset) {
        mouse.offset.x = offset.x;
        mouse.offset.y = offset.y;
        mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
        mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
    };

    /**
     * Sets the scale
     * @method setScale
     * @param {mouse} mouse
     */
    Mouse.setScale = function(mouse, scale) {
        mouse.scale.x = scale.x;
        mouse.scale.y = scale.y;
        mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
        mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
    };
    
    /**
     * Description
     * @method _getRelativeMousePosition
     * @private
     * @param {} event
     * @param {} element
     * @return ObjectExpression
     */
    var _getRelativeMousePosition = function(event, element) {
        var elementBounds = element.getBoundingClientRect(),
            rootNode = (document.documentElement || document.body.parentNode || document.body),
            scrollX = (window.pageXOffset !== undefined) ? window.pageXOffset : rootNode.scrollLeft,
            scrollY = (window.pageYOffset !== undefined) ? window.pageYOffset : rootNode.scrollTop,
            touches = event.changedTouches,
            x, y;
        
        if (touches) {
            x = touches[0].pageX - elementBounds.left - scrollX;
            y = touches[0].pageY - elementBounds.top - scrollY;
        } else {
            x = event.pageX - elementBounds.left - scrollX;
            y = event.pageY - elementBounds.top - scrollY;
        }
        
        return { 
            x: x / (element.clientWidth / element.width), 
            y: y / (element.clientHeight / element.height)
        };
    };

})();

;   // End src/core/Mouse.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Keyboard
*/

var Keyboard;

(function() {
    
    Keyboard = function() {
        var keyboard = this;

        this.sourceEvents = {
            keydown: null,
            keypress: null,
            keyup: null
        };
        
        this.keydown = function(event) {
            keyboard.sourceEvents.keydown = event;
        };

        this.keypress = function(event) {
            keyboard.sourceEvents.keypress = event;
        };

        this.keyup = function(event) {
            keyboard.sourceEvents.keyup = event;
        };

        Keyboard.set(keyboard);
    };

    /**
     * Description
     * @method create
     * @return {keyboard} A new keyboard
     */
    Keyboard.create = function() {
        return new Keyboard();
    };

    /**
     * @method set
     * @param {keyboard} keyboard
     */
    Keyboard.set = function(keyboard) {
        window.addEventListener('keydown', keyboard.keydown);
        window.addEventListener('keypress', keyboard.keypress);
        window.addEventListener('keyup', keyboard.keyup);
    };

    /**
     * Clears all captured source events
     * @method clearSourceEvents
     * @param {keyboard} keyboard
     */
    Keyboard.clearSourceEvents = function(keyboard) {
        keyboard.sourceEvents.keydown = null;
        keyboard.sourceEvents.keypress = null;
        keyboard.sourceEvents.keyup = null;
    };
})();

// Begin src/core/Sleeping.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Sleeping
*/

var Sleeping = {};

(function() {

    var _motionWakeThreshold = 0.18,
        _motionSleepThreshold = 0.08,
        _minBias = 0.9;

    /**
     * Description
     * @method update
     * @param {body[]} bodies
     */
    Sleeping.update = function(bodies) {
        // update bodies sleeping status
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                motion = body.speed * body.speed + body.angularSpeed * body.angularSpeed;

            // wake up bodies if they have a force applied
            if (body.force.x > 0 || body.force.y > 0) {
                Sleeping.set(body, false);
                continue;
            }

            var minMotion = Math.min(body.motion, motion),
                maxMotion = Math.max(body.motion, motion);
        
            // biased average motion estimation between frames
            body.motion = _minBias * minMotion + (1 - _minBias) * maxMotion;
            
            if (body.sleepThreshold > 0 && body.motion < _motionSleepThreshold) {
                body.sleepCounter += 1;
                
                if (body.sleepCounter >= body.sleepThreshold)
                    Sleeping.set(body, true);
            } else if (body.sleepCounter > 0) {
                body.sleepCounter -= 1;
            }
        }
    };

    /**
     * Description
     * @method afterCollisions
     * @param {pair[]} pairs
     */
    Sleeping.afterCollisions = function(pairs) {
        // wake up bodies involved in collisions
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            
            // don't wake inactive pairs
            if (!pair.isActive)
                continue;

            var collision = pair.collision,
                bodyA = collision.bodyA, 
                bodyB = collision.bodyB;
        
            // don't wake if at least one body is static
            if ((bodyA.isSleeping && bodyB.isSleeping) || bodyA.isStatic || bodyB.isStatic)
                continue;
        
            if (bodyA.isSleeping || bodyB.isSleeping) {
                var sleepingBody = (bodyA.isSleeping && !bodyA.isStatic) ? bodyA : bodyB,
                    movingBody = sleepingBody === bodyA ? bodyB : bodyA;

                if (!sleepingBody.isStatic && movingBody.motion > _motionWakeThreshold) {
                    Sleeping.set(sleepingBody, false);
                }
            }
        }
    };

    /**
     * Description
     * @method set
     * @param {body} body
     * @param {boolean} isSleeping
     */
    Sleeping.set = function(body, isSleeping) {
        if (isSleeping) {
            body.isSleeping = true;
            body.sleepCounter = body.sleepThreshold;

            body.positionImpulse.x = 0;
            body.positionImpulse.y = 0;

            body.positionPrev.x = body.position.x;
            body.positionPrev.y = body.position.y;

            body.anglePrev = body.angle;
            body.speed = 0;
            body.angularSpeed = 0;
            body.motion = 0;
        } else {
            body.isSleeping = false;
            body.sleepCounter = 0;
        }
    };

})();

;   // End src/core/Sleeping.js


// Begin src/factory/Bodies.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Bodies
*/

// TODO: true circle bodies

var Bodies = {};

(function() {

    /**
     * Description
     * @method rectangle
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {object} options
     * @return {body} A new rectangle body
     */
    Bodies.rectangle = function(x, y, width, height, options) {
        options = options || {};

        var rectangle = { 
            label: 'Rectangle Body',
            position: { x: x, y: y },
            vertices: Vertices.fromPath('L 0 0 L ' + width + ' 0 L ' + width + ' ' + height + ' L 0 ' + height)
        };

        if (options.chamfer) {
            var chamfer = options.chamfer;
            rectangle.vertices = Vertices.chamfer(rectangle.vertices, chamfer.radius, 
                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
            delete options.chamfer;
        }

        return Body.create(Common.extend({}, rectangle, options));
    };
    
    /**
     * Description
     * @method trapezoid
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} slope
     * @param {object} options
     * @return {body} A new trapezoid body
     */
    Bodies.trapezoid = function(x, y, width, height, slope, options) {
        options = options || {};

        slope *= 0.5;
        var roof = (1 - (slope * 2)) * width;
        
        var x1 = width * slope,
            x2 = x1 + roof,
            x3 = x2 + x1;

        var trapezoid = { 
            label: 'Trapezoid Body',
            position: { x: x, y: y },
            vertices: Vertices.fromPath('L 0 0 L ' + x1 + ' ' + (-height) + ' L ' + x2 + ' ' + (-height) + ' L ' + x3 + ' 0')
        };

        if (options.chamfer) {
            var chamfer = options.chamfer;
            trapezoid.vertices = Vertices.chamfer(trapezoid.vertices, chamfer.radius, 
                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
            delete options.chamfer;
        }

        return Body.create(Common.extend({}, trapezoid, options));
    };

    /**
     * Description
     * @method circle
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {object} options
     * @param {number} maxSides
     * @return {body} A new circle body
     */
    Bodies.circle = function(x, y, radius, options, maxSides) {
        options = options || {};
        options.label = 'Circle Body';
        
        // approximate circles with polygons until true circles implemented in SAT

        maxSides = maxSides || 25;
        var sides = Math.ceil(Math.max(10, Math.min(maxSides, radius)));

        // optimisation: always use even number of sides (half the number of unique axes)
        if (sides % 2 === 1)
            sides += 1;

        // flag for better rendering
        options.circleRadius = radius;

        return Bodies.polygon(x, y, sides, radius, options);
    };

    /**
     * Description
     * @method polygon
     * @param {number} x
     * @param {number} y
     * @param {number} sides
     * @param {number} radius
     * @param {object} options
     * @return {body} A new regular polygon body
     */
    Bodies.polygon = function(x, y, sides, radius, options) {
        options = options || {};

        if (sides < 3)
            return Bodies.circle(x, y, radius, options);

        var theta = 2 * Math.PI / sides,
            path = '',
            offset = theta * 0.5;

        for (var i = 0; i < sides; i += 1) {
            var angle = offset + (i * theta),
                xx = Math.cos(angle) * radius,
                yy = Math.sin(angle) * radius;

            path += 'L ' + xx.toFixed(3) + ' ' + yy.toFixed(3) + ' ';
        }

        var polygon = { 
            label: 'Polygon Body',
            position: { x: x, y: y },
            vertices: Vertices.fromPath(path)
        };

        if (options.chamfer) {
            var chamfer = options.chamfer;
            polygon.vertices = Vertices.chamfer(polygon.vertices, chamfer.radius, 
                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
            delete options.chamfer;
        }

        return Body.create(Common.extend({}, polygon, options));
    };

})();

;   // End src/factory/Bodies.js


// Begin src/factory/Composites.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Composites
*/

var Composites = {};

(function() {

    /**
     * Description
     * @method stack
     * @param {number} xx
     * @param {number} yy
     * @param {number} columns
     * @param {number} rows
     * @param {number} columnGap
     * @param {number} rowGap
     * @param {function} callback
     * @return {composite} A new composite containing objects created in the callback
     */
    Composites.stack = function(xx, yy, columns, rows, columnGap, rowGap, callback) {
        var stack = Composite.create({ label: 'Stack' }),
            x = xx,
            y = yy,
            lastBody,
            i = 0;

        for (var row = 0; row < rows; row++) {
            var maxHeight = 0;
            
            for (var column = 0; column < columns; column++) {
                var body = callback(x, y, column, row, lastBody, i);
                    
                if (body) {
                    var bodyHeight = body.bounds.max.y - body.bounds.min.y,
                        bodyWidth = body.bounds.max.x - body.bounds.min.x; 

                    if (bodyHeight > maxHeight)
                        maxHeight = bodyHeight;
                    
                    Body.translate(body, { x: bodyWidth * 0.5, y: bodyHeight * 0.5 });

                    x = body.bounds.max.x + columnGap;

                    Composite.addBody(stack, body);
                    
                    lastBody = body;
                    i += 1;
                }
            }
            
            y += maxHeight + rowGap;
            x = xx;
        }

        return stack;
    };
    
    /**
     * Description
     * @method chain
     * @param {composite} composite
     * @param {number} xOffsetA
     * @param {number} yOffsetA
     * @param {number} xOffsetB
     * @param {number} yOffsetB
     * @param {object} options
     * @return {composite} A new composite containing objects chained together with constraints
     */
    Composites.chain = function(composite, xOffsetA, yOffsetA, xOffsetB, yOffsetB, options) {
        var bodies = composite.bodies;
        
        for (var i = 1; i < bodies.length; i++) {
            var bodyA = bodies[i - 1],
                bodyB = bodies[i],
                bodyAHeight = bodyA.bounds.max.y - bodyA.bounds.min.y,
                bodyAWidth = bodyA.bounds.max.x - bodyA.bounds.min.x, 
                bodyBHeight = bodyB.bounds.max.y - bodyB.bounds.min.y,
                bodyBWidth = bodyB.bounds.max.x - bodyB.bounds.min.x;
        
            var defaults = {
                bodyA: bodyA,
                pointA: { x: bodyAWidth * xOffsetA, y: bodyAHeight * yOffsetA },
                bodyB: bodyB,
                pointB: { x: bodyBWidth * xOffsetB, y: bodyBHeight * yOffsetB }
            };
            
            var constraint = Common.extend(defaults, options);
        
            Composite.addConstraint(composite, Constraint.create(constraint));
        }

        composite.label += ' Chain';
        
        return composite;
    };

    /**
     * Connects bodies in the composite with constraints in a grid pattern, with optional cross braces
     * @method mesh
     * @param {composite} composite
     * @param {number} columns
     * @param {number} rows
     * @param {boolean} crossBrace
     * @param {object} options
     * @return {composite} The composite containing objects meshed together with constraints
     */
    Composites.mesh = function(composite, columns, rows, crossBrace, options) {
        var bodies = composite.bodies,
            row,
            col,
            bodyA,
            bodyB,
            bodyC;
        
        for (row = 0; row < rows; row++) {
            for (col = 0; col < columns; col++) {
                if (col > 0) {
                    bodyA = bodies[(col - 1) + (row * columns)];
                    bodyB = bodies[col + (row * columns)];
                    Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyA, bodyB: bodyB }, options)));
                }
            }

            for (col = 0; col < columns; col++) {
                if (row > 0) {
                    bodyA = bodies[col + ((row - 1) * columns)];
                    bodyB = bodies[col + (row * columns)];
                    Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyA, bodyB: bodyB }, options)));

                    if (crossBrace && col > 0) {
                        bodyC = bodies[(col - 1) + ((row - 1) * columns)];
                        Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyC, bodyB: bodyB }, options)));
                    }

                    if (crossBrace && col < columns - 1) {
                        bodyC = bodies[(col + 1) + ((row - 1) * columns)];
                        Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyC, bodyB: bodyB }, options)));
                    }
                }
            }
        }

        composite.label += ' Mesh';
        
        return composite;
    };
    
    /**
     * Description
     * @method pyramid
     * @param {number} xx
     * @param {number} yy
     * @param {number} columns
     * @param {number} rows
     * @param {number} columnGap
     * @param {number} rowGap
     * @param {function} callback
     * @return {composite} A new composite containing objects created in the callback
     */
    Composites.pyramid = function(xx, yy, columns, rows, columnGap, rowGap, callback) {
        return Composites.stack(xx, yy, columns, rows, columnGap, rowGap, function(x, y, column, row, lastBody, i) {
            var actualRows = Math.min(rows, Math.ceil(columns / 2)),
                lastBodyWidth = lastBody ? lastBody.bounds.max.x - lastBody.bounds.min.x : 0;
            
            if (row > actualRows)
                return;
            
            // reverse row order
            row = actualRows - row;
            
            var start = row,
                end = columns - 1 - row;

            if (column < start || column > end)
                return;
            
            // retroactively fix the first body's position, since width was unknown
            if (i === 1) {
                Body.translate(lastBody, { x: (column + (columns % 2 === 1 ? 1 : -1)) * lastBodyWidth, y: 0 });
            }

            var xOffset = lastBody ? column * lastBodyWidth : 0;
            
            return callback(xx + xOffset + column * columnGap, y, column, row, lastBody, i);
        });
    };

    /**
     * Description
     * @method newtonsCradle
     * @param {number} xx
     * @param {number} yy
     * @param {number} number
     * @param {number} size
     * @param {number} length
     * @return {composite} A new composite newtonsCradle body
     */
    Composites.newtonsCradle = function(xx, yy, number, size, length) {
        var newtonsCradle = Composite.create({ label: 'Newtons Cradle' });

        for (var i = 0; i < number; i++) {
            var separation = 1.9,
                circle = Bodies.circle(xx + i * (size * separation), yy + length, size, 
                            { inertia: 99999, restitution: 1, friction: 0, frictionAir: 0.0001, slop: 0.01 }),
                constraint = Constraint.create({ pointA: { x: xx + i * (size * separation), y: yy }, bodyB: circle });

            Composite.addBody(newtonsCradle, circle);
            Composite.addConstraint(newtonsCradle, constraint);
        }

        return newtonsCradle;
    };
    
    /**
     * Description
     * @method car
     * @param {number} xx
     * @param {number} yy
     * @param {number} width
     * @param {number} height
     * @param {number} wheelSize
     * @return {composite} A new composite car body
     */
    Composites.car = function(xx, yy, width, height, wheelSize) {
        var groupId = Body.nextGroupId(),
            wheelBase = -20,
            wheelAOffset = -width * 0.5 + wheelBase,
            wheelBOffset = width * 0.5 - wheelBase,
            wheelYOffset = 0;
    
        var car = Composite.create({ label: 'Car' }),
            body = Bodies.trapezoid(xx, yy, width, height, 0.3, { 
                groupId: groupId, 
                friction: 0.01,
                chamfer: {
                    radius: 10
                }
            });
    
        var wheelA = Bodies.circle(xx + wheelAOffset, yy + wheelYOffset, wheelSize, { 
            groupId: groupId, 
            restitution: 0.5, 
            friction: 0.9,
            density: 0.01
        });
                    
        var wheelB = Bodies.circle(xx + wheelBOffset, yy + wheelYOffset, wheelSize, { 
            groupId: groupId, 
            restitution: 0.5, 
            friction: 0.9,
            density: 0.01
        });
                    
        var axelA = Constraint.create({
            bodyA: body,
            pointA: { x: wheelAOffset, y: wheelYOffset },
            bodyB: wheelA,
            stiffness: 0.5
        });
                        
        var axelB = Constraint.create({
            bodyA: body,
            pointA: { x: wheelBOffset, y: wheelYOffset },
            bodyB: wheelB,
            stiffness: 0.5
        });
        
        Composite.addBody(car, body);
        Composite.addBody(car, wheelA);
        Composite.addBody(car, wheelB);
        Composite.addConstraint(car, axelA);
        Composite.addConstraint(car, axelB);

        return car;
    };

    /**
     * Creates a simple soft body like object
     * @method softBody
     * @param {number} xx
     * @param {number} yy
     * @param {number} columns
     * @param {number} rows
     * @param {number} columnGap
     * @param {number} rowGap
     * @param {boolean} crossBrace
     * @param {number} particleRadius
     * @param {} particleOptions
     * @param {} constraintOptions
     * @return {composite} A new composite softBody
     */
    Composites.softBody = function(xx, yy, columns, rows, columnGap, rowGap, crossBrace, particleRadius, particleOptions, constraintOptions) {
        particleOptions = Common.extend({ inertia: Infinity }, particleOptions);
        constraintOptions = Common.extend({ stiffness: 0.4 }, constraintOptions);

        var softBody = Composites.stack(xx, yy, columns, rows, columnGap, rowGap, function(x, y, column, row) {
            return Bodies.circle(x, y, particleRadius, particleOptions);
        });

        Composites.mesh(softBody, columns, rows, crossBrace, constraintOptions);

        softBody.label = 'Soft Body';

        return softBody;
    };

})();

;   // End src/factory/Composites.js


// Begin src/geometry/Axes.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Axes
*/

var Axes = {};

(function() {

    /**
     * Description
     * @method fromVertices
     * @param {vertices} vertices
     * @return {axes} A new axes from the given vertices
     */
    Axes.fromVertices = function(vertices) {
        var axes = {};

        // find the unique axes, using edge normal gradients
        for (var i = 0; i < vertices.length; i++) {
            var j = (i + 1) % vertices.length, 
                normal = Vector.normalise({ 
                    x: vertices[j].y - vertices[i].y, 
                    y: vertices[i].x - vertices[j].x
                }),
                gradient = (normal.y === 0) ? Infinity : (normal.x / normal.y);
            
            // limit precision
            gradient = gradient.toFixed(3).toString();

            axes[gradient] = normal;
        }

        return Common.values(axes);
    };

    /**
     * Description
     * @method rotate
     * @param {axes} axes
     * @param {number} angle
     */
    Axes.rotate = function(axes, angle) {
        if (angle === 0)
            return;
        
        var cos = Math.cos(angle),
            sin = Math.sin(angle);

        for (var i = 0; i < axes.length; i++) {
            var axis = axes[i],
                xx;
            xx = axis.x * cos - axis.y * sin;
            axis.y = axis.x * sin + axis.y * cos;
            axis.x = xx;
        }
    };

})();

;   // End src/geometry/Axes.js


// Begin src/geometry/Bounds.js

/**
* _Internal Class_, not generally used outside of the engine's internals.
*
* @class Bounds
*/

var Bounds = {};

(function() {

    /**
     * Description
     * @method create
     * @param {vertices} vertices
     * @return {bounds} A new bounds object
     */
    Bounds.create = function(vertices) {
        var bounds = { 
            min: { x: 0, y: 0 }, 
            max: { x: 0, y: 0 }
        };

        if (vertices)
            Bounds.update(bounds, vertices);
        
        return bounds;
    };

    /**
     * Description
     * @method update
     * @param {bounds} bounds
     * @param {vertices} vertices
     * @param {vector} velocity
     */
    Bounds.update = function(bounds, vertices, velocity) {
        bounds.min.x = Number.MAX_VALUE;
        bounds.max.x = Number.MIN_VALUE;
        bounds.min.y = Number.MAX_VALUE;
        bounds.max.y = Number.MIN_VALUE;

        for (var i = 0; i < vertices.length; i++) {
            var vertex = vertices[i];
            if (vertex.x > bounds.max.x) bounds.max.x = vertex.x;
            if (vertex.x < bounds.min.x) bounds.min.x = vertex.x;
            if (vertex.y > bounds.max.y) bounds.max.y = vertex.y;
            if (vertex.y < bounds.min.y) bounds.min.y = vertex.y;
        }
        
        if (velocity) {
            if (velocity.x > 0) {
                bounds.max.x += velocity.x;
            } else {
                bounds.min.x += velocity.x;
            }
            
            if (velocity.y > 0) {
                bounds.max.y += velocity.y;
            } else {
                bounds.min.y += velocity.y;
            }
        }
    };

    /**
     * Description
     * @method contains
     * @param {bounds} bounds
     * @param {vector} point
     * @return {boolean} True if the bounds contain the point, otherwise false
     */
    Bounds.contains = function(bounds, point) {
        return point.x >= bounds.min.x && point.x <= bounds.max.x 
               && point.y >= bounds.min.y && point.y <= bounds.max.y;
    };

    /**
     * Description
     * @method overlaps
     * @param {bounds} boundsA
     * @param {bounds} boundsB
     * @return {boolean} True if the bounds overlap, otherwise false
     */
    Bounds.overlaps = function(boundsA, boundsB) {
        return (boundsA.min.x <= boundsB.max.x && boundsA.max.x >= boundsB.min.x
                && boundsA.max.y >= boundsB.min.y && boundsA.min.y <= boundsB.max.y);
    };

    /**
     * Translates the bounds by the given vector
     * @method translate
     * @param {bounds} bounds
     * @param {vector} vector
     */
    Bounds.translate = function(bounds, vector) {
        bounds.min.x += vector.x;
        bounds.max.x += vector.x;
        bounds.min.y += vector.y;
        bounds.max.y += vector.y;
    };

    /**
     * Shifts the bounds to the given position
     * @method shift
     * @param {bounds} bounds
     * @param {vector} position
     */
    Bounds.shift = function(bounds, position) {
        var deltaX = bounds.max.x - bounds.min.x,
            deltaY = bounds.max.y - bounds.min.y;
            
        bounds.min.x = position.x;
        bounds.max.x = position.x + deltaX;
        bounds.min.y = position.y;
        bounds.max.y = position.y + deltaY;
    };
    
})();

;   // End src/geometry/Bounds.js


// Begin src/geometry/Vector.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Vector
*/

// TODO: consider params for reusing vector objects

var Vector = {};

(function() {

    /**
     * Description
     * @method magnitude
     * @param {vector} vector
     * @return {number} The magnitude of the vector
     */
    Vector.magnitude = function(vector) {
        return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y));
    };

    /**
     * Description
     * @method magnitudeSquared
     * @param {vector} vector
     * @return {number} The squared magnitude of the vector
     */
    Vector.magnitudeSquared = function(vector) {
        return (vector.x * vector.x) + (vector.y * vector.y);
    };

    /**
     * Description
     * @method rotate
     * @param {vector} vector
     * @param {number} angle
     * @return {vector} A new vector rotated
     */
    Vector.rotate = function(vector, angle) {
        var cos = Math.cos(angle), sin = Math.sin(angle);
        return {
            x: vector.x * cos - vector.y * sin,
            y: vector.x * sin + vector.y * cos
        };
    };

    /**
     * Description
     * @method rotateAbout
     * @param {vector} vector
     * @param {number} angle
     * @param {vector} point
     * @return {vector} A new vector rotated about the point
     */
    Vector.rotateAbout = function(vector, angle, point) {
        var cos = Math.cos(angle), sin = Math.sin(angle);
        return {
            x: point.x + ((vector.x - point.x) * cos - (vector.y - point.y) * sin),
            y: point.y + ((vector.x - point.x) * sin + (vector.y - point.y) * cos)
        };
    };

    /**
     * Description
     * @method normalise
     * @param {vector} vector
     * @return {vector} A new vector normalised
     */
    Vector.normalise = function(vector) {
        var magnitude = Vector.magnitude(vector);
        if (magnitude === 0)
            return { x: 0, y: 0 };
        return { x: vector.x / magnitude, y: vector.y / magnitude };
    };

    /**
     * Description
     * @method dot
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The dot product of the two vectors
     */
    Vector.dot = function(vectorA, vectorB) {
        return (vectorA.x * vectorB.x) + (vectorA.y * vectorB.y);
    };

    /**
     * Description
     * @method cross
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The cross product of the two vectors
     */
    Vector.cross = function(vectorA, vectorB) {
        return (vectorA.x * vectorB.y) - (vectorA.y * vectorB.x);
    };

    /**
     * Description
     * @method add
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {vector} A new vector added
     */
    Vector.add = function(vectorA, vectorB) {
        return { x: vectorA.x + vectorB.x, y: vectorA.y + vectorB.y };
    };

    /**
     * Description
     * @method sub
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {vector} A new vector subtracted
     */
    Vector.sub = function(vectorA, vectorB) {
        return { x: vectorA.x - vectorB.x, y: vectorA.y - vectorB.y };
    };

    /**
     * Description
     * @method mult
     * @param {vector} vector
     * @param {number} scalar
     * @return {vector} A new vector multiplied by scalar
     */
    Vector.mult = function(vector, scalar) {
        return { x: vector.x * scalar, y: vector.y * scalar };
    };

    /**
     * Description
     * @method div
     * @param {vector} vector
     * @param {number} scalar
     * @return {vector} A new vector divided by scalar
     */
    Vector.div = function(vector, scalar) {
        return { x: vector.x / scalar, y: vector.y / scalar };
    };

    /**
     * Description
     * @method perp
     * @param {vector} vector
     * @param {bool} negate
     * @return {vector} The perpendicular vector
     */
    Vector.perp = function(vector, negate) {
        negate = negate === true ? -1 : 1;
        return { x: negate * -vector.y, y: negate * vector.x };
    };

    /**
     * Description
     * @method neg
     * @param {vector} vector
     * @return {vector} The negated vector
     */
    Vector.neg = function(vector) {
        return { x: -vector.x, y: -vector.y };
    };

    /**
     * Returns the angle in radians between the two vectors relative to the x-axis
     * @method angle
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The angle in radians
     */
    Vector.angle = function(vectorA, vectorB) {
        return Math.atan2(vectorB.y - vectorA.y, vectorB.x - vectorA.x);
    };

})();

;   // End src/geometry/Vector.js


// Begin src/geometry/Vertices.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Vertices
*/

// TODO: convex decomposition - http://mnbayazit.com/406/bayazit

var Vertices = {};

(function() {

    /**
     * Description
     * @method create
     * @param {vertices} vertices
     * @param {body} body
     */
    Vertices.create = function(vertices, body) {
        for (var i = 0; i < vertices.length; i++) {
            vertices[i].index = i;
            vertices[i].body = body;
        }
    };

    /**
     * Description
     * @method fromPath
     * @param {string} path
     * @return {vertices} vertices
     */
    Vertices.fromPath = function(path) {
        var pathPattern = /L\s*([\-\d\.]*)\s*([\-\d\.]*)/ig,
            vertices = [];

        path.replace(pathPattern, function(match, x, y) {
            vertices.push({ x: parseFloat(x, 10), y: parseFloat(y, 10) });
        });

        return vertices;
    };

    /**
     * Description
     * @method centre
     * @param {vertices} vertices
     * @return {vector} The centre point
     */
    Vertices.centre = function(vertices) {
        var area = Vertices.area(vertices, true),
            centre = { x: 0, y: 0 },
            cross,
            temp,
            j;

        for (var i = 0; i < vertices.length; i++) {
            j = (i + 1) % vertices.length;
            cross = Vector.cross(vertices[i], vertices[j]);
            temp = Vector.mult(Vector.add(vertices[i], vertices[j]), cross);
            centre = Vector.add(centre, temp);
        }

        return Vector.div(centre, 6 * area);
    };

    /**
     * Description
     * @method area
     * @param {vertices} vertices
     * @param {bool} signed
     * @return {number} The area
     */
    Vertices.area = function(vertices, signed) {
        var area = 0,
            j = vertices.length - 1;

        for (var i = 0; i < vertices.length; i++) {
            area += (vertices[j].x - vertices[i].x) * (vertices[j].y + vertices[i].y);
            j = i;
        }

        if (signed)
            return area / 2;

        return Math.abs(area) / 2;
    };

    /**
     * Description
     * @method inertia
     * @param {vertices} vertices
     * @param {number} mass
     * @return {number} The polygon's moment of inertia, using second moment of area
     */
    Vertices.inertia = function(vertices, mass) {
        var numerator = 0,
            denominator = 0,
            v = vertices,
            cross,
            j;

        // find the polygon's moment of inertia, using second moment of area
        // http://www.physicsforums.com/showthread.php?t=25293
        for (var n = 0; n < v.length; n++) {
            j = (n + 1) % v.length;
            cross = Math.abs(Vector.cross(v[j], v[n]));
            numerator += cross * (Vector.dot(v[j], v[j]) + Vector.dot(v[j], v[n]) + Vector.dot(v[n], v[n]));
            denominator += cross;
        }

        return (mass / 6) * (numerator / denominator);
    };

    /**
     * Description
     * @method translate
     * @param {vertices} vertices
     * @param {vector} vector
     * @param {number} scalar
     */
    Vertices.translate = function(vertices, vector, scalar) {
        var i;
        if (scalar) {
            for (i = 0; i < vertices.length; i++) {
                vertices[i].x += vector.x * scalar;
                vertices[i].y += vector.y * scalar;
            }
        } else {
            for (i = 0; i < vertices.length; i++) {
                vertices[i].x += vector.x;
                vertices[i].y += vector.y;
            }
        } 
    };

    /**
     * Description
     * @method rotate
     * @param {vertices} vertices
     * @param {number} angle
     * @param {vector} point
     */
    Vertices.rotate = function(vertices, angle, point) {
        if (angle === 0)
            return;

        var cos = Math.cos(angle),
            sin = Math.sin(angle);

        for (var i = 0; i < vertices.length; i++) {
            var vertice = vertices[i],
                dx = vertice.x - point.x,
                dy = vertice.y - point.y;
                
            vertice.x = point.x + (dx * cos - dy * sin);
            vertice.y = point.y + (dx * sin + dy * cos);
        }
    };

    /**
     * Description
     * @method contains
     * @param {vertices} vertices
     * @param {vector} point
     * @return {boolean} True if the vertices contains point, otherwise false
     */
    Vertices.contains = function(vertices, point) {
        for (var i = 0; i < vertices.length; i++) {
            var vertice = vertices[i],
                nextVertice = vertices[(i + 1) % vertices.length];
            if ((point.x - vertice.x) * (nextVertice.y - vertice.y) + (point.y - vertice.y) * (vertice.x - nextVertice.x) > 0) {
                return false;
            }
        }

        return true;
    };

    /**
     * Scales the vertices from a point (default is centre)
     * @method scale
     * @param {vertices} vertices
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {vector} point
     */
    Vertices.scale = function(vertices, scaleX, scaleY, point) {
        if (scaleX === 1 && scaleY === 1)
            return vertices;

        point = point || Vertices.centre(vertices);

        var vertex,
            delta;

        for (var i = 0; i < vertices.length; i++) {
            vertex = vertices[i];
            delta = Vector.sub(vertex, point);
            vertices[i].x = point.x + delta.x * scaleX;
            vertices[i].y = point.y + delta.y * scaleY;
        }

        return vertices;
    };

    /**
     * Chamfers a set of vertices by giving them rounded corners, returns a new set of vertices.
     * The radius parameter is a single number or an array to specify the radius for each vertex.
     * @method chamfer
     * @param {vertices} vertices
     * @param {number[]} radius
     * @param {number} quality
     * @param {number} qualityMin
     * @param {number} qualityMax
     */
    Vertices.chamfer = function(vertices, radius, quality, qualityMin, qualityMax) {
        radius = radius || [8];

        if (!radius.length)
            radius = [radius];

        // quality defaults to -1, which is auto
        quality = (typeof quality !== 'undefined') ? quality : -1;
        qualityMin = qualityMin || 2;
        qualityMax = qualityMax || 14;

        var centre = Vertices.centre(vertices),
            newVertices = [];

        for (var i = 0; i < vertices.length; i++) {
            var prevVertex = vertices[i - 1 >= 0 ? i - 1 : vertices.length - 1],
                vertex = vertices[i],
                nextVertex = vertices[(i + 1) % vertices.length],
                currentRadius = radius[i < radius.length ? i : radius.length - 1];

            if (currentRadius === 0) {
                newVertices.push(vertex);
                continue;
            }

            var prevNormal = Vector.normalise({ 
                x: vertex.y - prevVertex.y, 
                y: prevVertex.x - vertex.x
            });

            var nextNormal = Vector.normalise({ 
                x: nextVertex.y - vertex.y, 
                y: vertex.x - nextVertex.x
            });

            var diagonalRadius = Math.sqrt(2 * Math.pow(currentRadius, 2)),
                radiusVector = Vector.mult(Common.clone(prevNormal), currentRadius),
                midNormal = Vector.normalise(Vector.mult(Vector.add(prevNormal, nextNormal), 0.5)),
                scaledVertex = Vector.sub(vertex, Vector.mult(midNormal, diagonalRadius));

            var precision = quality;

            if (quality === -1) {
                // automatically decide precision
                precision = Math.pow(currentRadius, 0.32) * 1.75;
            }

            precision = Common.clamp(precision, qualityMin, qualityMax);

            // use an even value for precision, more likely to reduce axes by using symmetry
            if (precision % 2 === 1)
                precision += 1;

            var alpha = Math.acos(Vector.dot(prevNormal, nextNormal)),
                theta = alpha / precision;

            for (var j = 0; j < precision; j++) {
                newVertices.push(Vector.add(Vector.rotate(radiusVector, theta * j), scaledVertex));
            }
        }

        return newVertices;
    };

})();

;   // End src/geometry/Vertices.js


// Begin src/render/Render.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class Render
*/

// TODO: viewports
// TODO: two.js, pixi.js

var Render = {};

(function() {
    
    /**
     * Description
     * @method create
     * @param {object} options
     * @return {render} A new renderer
     */
    Render.create = function(options) {
        var defaults = {
            controller: Render,
            element: null,
            canvas: null,
            options: {
                width: 800,
                height: 600,
                background: '#fafafa',
                wireframeBackground: '#222',
                hasBounds: false,
                enabled: true,
                wireframes: true,
                showSleeping: true,
                showDebug: false,
                showBroadphase: false,
                showBounds: false,
                showVelocity: false,
                showCollisions: false,
                showAxes: false,
                showPositions: false,
                showAngleIndicator: false,
                showIds: false,
                showShadows: false
            }
        };

        var render = Common.extend(defaults, options);

        render.canvas = render.canvas || _createCanvas(render.options.width, render.options.height);
        render.context = render.canvas.getContext('2d');
        render.textures = {};

        render.bounds = render.bounds || { 
            min: { 
                x: 0,
                y: 0
            }, 
            max: { 
                x: render.options.width,
                y: render.options.height
            }
        };

        Render.setBackground(render, render.options.background);

        if (Common.isElement(render.element)) {
            render.element.appendChild(render.canvas);
        } else {
            Common.log('No "render.element" passed, "render.canvas" was not inserted into document.', 'warn');
        }

        return render;
    };

    /**
     * Clears the renderer. In this implementation, this is a noop.
     * @method clear
     * @param {RenderPixi} render
     */
    Render.clear = function(render) {
        // nothing required to clear this renderer implentation
        // if a scene graph is required, clear it here (see RenderPixi.js)
    };

    /**
     * Sets the background CSS property of the canvas 
     * @method setBackground
     * @param {render} render
     * @param {string} background
     */
    Render.setBackground = function(render, background) {
        if (render.currentBackground !== background) {
            var cssBackground = background;

            if (/(jpg|gif|png)$/.test(background))
                cssBackground = 'url(' + background + ')';

            render.canvas.style.background = cssBackground;
            render.canvas.style.backgroundSize = "contain";
            render.currentBackground = background;
        }
    };

    /**
     * Description
     * @method world
     * @param {engine} engine
     */
    Render.world = function(engine) {
        var render = engine.render,
            world = engine.world,
            canvas = render.canvas,
            context = render.context,
            options = render.options,
            allBodies = Composite.allBodies(world),
            allConstraints = Composite.allConstraints(world),
            bodies = [],
            constraints = [],
            i;

        if (options.wireframes) {
            Render.setBackground(render, options.wireframeBackground);
        } else {
            Render.setBackground(render, options.background);
        }

        // clear the canvas with a transparent fill, to allow the canvas background to show
        context.globalCompositeOperation = 'source-in';
        context.fillStyle = "transparent";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'source-over';

        // handle bounds
        var boundsWidth = render.bounds.max.x - render.bounds.min.x,
            boundsHeight = render.bounds.max.y - render.bounds.min.y,
            boundsScaleX = boundsWidth / render.options.width,
            boundsScaleY = boundsHeight / render.options.height;

        if (options.hasBounds) {
            // filter out bodies that are not in view
            for (i = 0; i < allBodies.length; i++) {
                var body = allBodies[i];
                if (Bounds.overlaps(body.bounds, render.bounds))
                    bodies.push(body);
            }

            // filter out constraints that are not in view
            for (i = 0; i < allConstraints.length; i++) {
                var constraint = allConstraints[i],
                    bodyA = constraint.bodyA,
                    bodyB = constraint.bodyB,
                    pointAWorld = constraint.pointA,
                    pointBWorld = constraint.pointB;

                if (bodyA) pointAWorld = Vector.add(bodyA.position, constraint.pointA);
                if (bodyB) pointBWorld = Vector.add(bodyB.position, constraint.pointB);

                if (!pointAWorld || !pointBWorld)
                    continue;

                if (Bounds.contains(render.bounds, pointAWorld) || Bounds.contains(render.bounds, pointBWorld))
                    constraints.push(constraint);
            }

            // transform the view
            context.scale(1 / boundsScaleX, 1 / boundsScaleY);
            context.translate(-render.bounds.min.x, -render.bounds.min.y);
        } else {
            constraints = allConstraints;
            bodies = allBodies;
        }

        if (!options.wireframes || (engine.enableSleeping && options.showSleeping)) {
            // fully featured rendering of bodies
            Render.bodies(engine, bodies, context);
        } else {
            // optimised method for wireframes only
            Render.bodyWireframes(engine, bodies, context);
        }

        if (options.showBounds)
            Render.bodyBounds(engine, bodies, context);

        if (options.showAxes || options.showAngleIndicator)
            Render.bodyAxes(engine, bodies, context);
        
        if (options.showPositions)
            Render.bodyPositions(engine, bodies, context);

        if (options.showVelocity)
            Render.bodyVelocity(engine, bodies, context);

        if (options.showIds)
            Render.bodyIds(engine, bodies, context);

        if (options.showCollisions)
            Render.collisions(engine, engine.pairs.list, context);

        Render.constraints(constraints, context);

        if (options.showBroadphase && engine.broadphase.current === 'grid')
            Render.grid(engine, engine.broadphase[engine.broadphase.current].instance, context);

        if (options.showDebug)
            Render.debug(engine, context);

        if (options.hasBounds) {
            // revert view transforms
            context.setTransform(1, 0, 0, 1, 0, 0);
        }
    };

    /**
     * Description
     * @method debug
     * @param {engine} engine
     * @param {RenderingContext} context
     */
    Render.debug = function(engine, context) {
        var c = context,
            world = engine.world,
            render = engine.render,
            options = render.options,
            bodies = Composite.allBodies(world),
            space = "    ";

        if (engine.timing.timestamp - (render.debugTimestamp || 0) >= 500) {
            var text = "";
            text += "fps: " + Math.round(engine.timing.fps) + space;

            if (engine.metrics.extended) {
                text += "delta: " + engine.timing.delta.toFixed(3) + space;
                text += "correction: " + engine.timing.correction.toFixed(3) + space;
                text += "bodies: " + bodies.length + space;

                if (engine.broadphase.controller === Grid)
                    text += "buckets: " + engine.metrics.buckets + space;

                text += "\n";

                text += "collisions: " + engine.metrics.collisions + space;
                text += "pairs: " + engine.pairs.list.length + space;
                text += "broad: " + engine.metrics.broadEff + space;
                text += "mid: " + engine.metrics.midEff + space;
                text += "narrow: " + engine.metrics.narrowEff + space;
            }            

            render.debugString = text;
            render.debugTimestamp = engine.timing.timestamp;
        }

        if (render.debugString) {
            c.font = "12px Arial";

            if (options.wireframes) {
                c.fillStyle = 'rgba(255,255,255,0.5)';
            } else {
                c.fillStyle = 'rgba(0,0,0,0.5)';
            }

            var split = render.debugString.split('\n');

            for (var i = 0; i < split.length; i++) {
                c.fillText(split[i], 50, 50 + i * 18);
            }
        }
    };

    /**
     * Description
     * @method constraints
     * @param {constraint[]} constraints
     * @param {RenderingContext} context
     */
    Render.constraints = function(constraints, context) {
        var c = context;

        for (var i = 0; i < constraints.length; i++) {
            var constraint = constraints[i];

            if (!constraint.render.visible || !constraint.pointA || !constraint.pointB)
                continue;

            var bodyA = constraint.bodyA,
                bodyB = constraint.bodyB;

            if (bodyA) {
                c.beginPath();
                c.moveTo(bodyA.position.x + constraint.pointA.x, bodyA.position.y + constraint.pointA.y);
            } else {
                c.beginPath();
                c.moveTo(constraint.pointA.x, constraint.pointA.y);
            }

            if (bodyB) {
                c.lineTo(bodyB.position.x + constraint.pointB.x, bodyB.position.y + constraint.pointB.y);
            } else {
                c.lineTo(constraint.pointB.x, constraint.pointB.y);
            }

            c.lineWidth = constraint.render.lineWidth;
            c.strokeStyle = constraint.render.strokeStyle;
            c.stroke();
        }
    };
    
    /**
     * Description
     * @method bodyShadows
     * @param {engine} engine
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyShadows = function(engine, bodies, context) {
        var c = context,
            render = engine.render,
            options = render.options;

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (!body.render.visible)
                continue;

            if (body.circleRadius) {
                c.beginPath();
                c.arc(body.position.x, body.position.y, body.circleRadius, 0, 2 * Math.PI);
                c.closePath();
            } else {
                c.beginPath();
                c.moveTo(body.vertices[0].x, body.vertices[0].y);
                for (var j = 1; j < body.vertices.length; j++) {
                    c.lineTo(body.vertices[j].x, body.vertices[j].y);
                }
                c.closePath();
            }

            var distanceX = body.position.x - render.options.width * 0.5,
                distanceY = body.position.y - render.options.height * 0.2,
                distance = Math.abs(distanceX) + Math.abs(distanceY);

            c.shadowColor = 'rgba(0,0,0,0.15)';
            c.shadowOffsetX = 0.05 * distanceX;
            c.shadowOffsetY = 0.05 * distanceY;
            c.shadowBlur = 1 + 12 * Math.min(1, distance / 1000);

            c.fill();

            c.shadowColor = null;
            c.shadowOffsetX = null;
            c.shadowOffsetY = null;
            c.shadowBlur = null;
        }
    };

    /**
     * Description
     * @method bodies
     * @param {engine} engine
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodies = function(engine, bodies, context) {
        var c = context,
            render = engine.render,
            options = render.options,
            i;

        for (i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (!body.render.visible)
                continue;

            if (body.render.sprite && body.render.sprite.texture && !options.wireframes) {
                // body sprite
                var sprite = body.render.sprite,
                    texture = _getTexture(render, sprite.texture);

                if (options.showSleeping && body.isSleeping) 
                    c.globalAlpha = 0.5;

                c.translate(body.position.x, body.position.y); 
                c.rotate(body.angle);

                c.drawImage(texture, texture.width * -0.5 * sprite.xScale, texture.height * -0.5 * sprite.yScale, 
                            texture.width * sprite.xScale, texture.height * sprite.yScale);

                // revert translation, hopefully faster than save / restore
                c.rotate(-body.angle);
                c.translate(-body.position.x, -body.position.y); 

                if (options.showSleeping && body.isSleeping) 
                    c.globalAlpha = 1;
            } else {
                // body polygon
                if (body.circleRadius) {
                    c.beginPath();
                    c.arc(body.position.x, body.position.y, body.circleRadius, 0, 2 * Math.PI);
                } else {
                    c.beginPath();
                    c.moveTo(body.vertices[0].x, body.vertices[0].y);
                    for (var j = 1; j < body.vertices.length; j++) {
                        c.lineTo(body.vertices[j].x, body.vertices[j].y);
                    }
                    c.closePath();
                }

                if (!options.wireframes) {
                    if (options.showSleeping && body.isSleeping) {
                        c.fillStyle = Common.shadeColor(body.render.fillStyle, 50);
                    } else {
                        c.fillStyle = body.render.fillStyle;
                    }

                    c.lineWidth = body.render.lineWidth;
                    c.strokeStyle = body.render.strokeStyle;
                    c.fill();
                    c.stroke();
                } else {
                    c.lineWidth = 1;
                    c.strokeStyle = '#bbb';
                    if (options.showSleeping && body.isSleeping)
                        c.strokeStyle = 'rgba(255,255,255,0.2)';
                    c.stroke();
                }
            }
        }

    };

    /**
     * Optimised method for drawing body wireframes in one pass
     * @method bodyWireframes
     * @param {engine} engine
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyWireframes = function(engine, bodies, context) {
        var c = context,
            i,
            j;

        c.beginPath();

        for (i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (!body.render.visible)
                continue;

            c.moveTo(body.vertices[0].x, body.vertices[0].y);

            for (j = 1; j < body.vertices.length; j++) {
                c.lineTo(body.vertices[j].x, body.vertices[j].y);
            }
            
            c.lineTo(body.vertices[0].x, body.vertices[0].y);
        }

        c.lineWidth = 1;
        c.strokeStyle = '#bbb';
        c.stroke();
    };

    /**
     * Draws body bounds
     * @method bodyBounds
     * @param {engine} engine
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyBounds = function(engine, bodies, context) {
        var c = context,
            render = engine.render,
            options = render.options;

        c.beginPath();

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.render.visible)
                c.rect(body.bounds.min.x, body.bounds.min.y, body.bounds.max.x - body.bounds.min.x, body.bounds.max.y - body.bounds.min.y);
        }

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,255,255,0.08)';
        } else {
            c.strokeStyle = 'rgba(0,0,0,0.1)';
        }

        c.lineWidth = 1;
        c.stroke();
    };

    /**
     * Draws body angle indicators and axes
     * @method bodyAxes
     * @param {engine} engine
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyAxes = function(engine, bodies, context) {
        var c = context,
            render = engine.render,
            options = render.options,
            i,
            j;

        c.beginPath();

        for (i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (!body.render.visible)
                continue;

            if (options.showAxes) {
                // render all axes
                for (j = 0; j < body.axes.length; j++) {
                    var axis = body.axes[j];
                    c.moveTo(body.position.x, body.position.y);
                    c.lineTo(body.position.x + axis.x * 20, body.position.y + axis.y * 20);
                }
            } else {
                // render a single axis indicator
                c.moveTo(body.position.x, body.position.y);
                c.lineTo((body.vertices[0].x + body.vertices[body.vertices.length-1].x) / 2, 
                         (body.vertices[0].y + body.vertices[body.vertices.length-1].y) / 2);
            }
        }

        if (options.wireframes) {
            c.strokeStyle = 'indianred';
        } else {
            c.strokeStyle = 'rgba(0,0,0,0.3)';
        }

        c.lineWidth = 1;
        c.stroke();
    };

    /**
     * Draws body positions
     * @method bodyPositions
     * @param {engine} engine
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyPositions = function(engine, bodies, context) {
        var c = context,
            render = engine.render,
            options = render.options,
            body,
            i;

        c.beginPath();

        // render current positions
        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];
            if (body.render.visible) {
                c.arc(body.position.x, body.position.y, 3, 0, 2 * Math.PI, false);
                c.closePath();
            }
        }

        if (options.wireframes) {
            c.fillStyle = 'indianred';
        } else {
            c.fillStyle = 'rgba(0,0,0,0.5)';
        }
        c.fill();

        c.beginPath();

        // render previous positions
        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];
            if (body.render.visible) {
                c.arc(body.positionPrev.x, body.positionPrev.y, 2, 0, 2 * Math.PI, false);
                c.closePath();
            }
        }

        c.fillStyle = 'rgba(255,165,0,0.8)';
        c.fill();
    };

    /**
     * Draws body velocity
     * @method bodyVelocity
     * @param {engine} engine
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyVelocity = function(engine, bodies, context) {
        var c = context,
            render = engine.render,
            options = render.options;

        c.beginPath();

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (!body.render.visible)
                continue;

            c.moveTo(body.position.x, body.position.y);
            c.lineTo(body.position.x + (body.position.x - body.positionPrev.x) * 2, body.position.y + (body.position.y - body.positionPrev.y) * 2);
        }

        c.lineWidth = 3;
        c.strokeStyle = 'cornflowerblue';
        c.stroke();
    };

    /**
     * Draws body ids
     * @method bodyIds
     * @param {engine} engine
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyIds = function(engine, bodies, context) {
        var c = context;

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (!body.render.visible)
                continue;

            c.font = "12px Arial";
            c.fillStyle = 'rgba(255,255,255,0.5)';
            c.fillText(body.id, body.position.x + 10, body.position.y - 10);
        }
    };

    /**
     * Description
     * @method collisions
     * @param {engine} engine
     * @param {pair[]} pairs
     * @param {RenderingContext} context
     */
    Render.collisions = function(engine, pairs, context) {
        var c = context,
            options = engine.render.options,
            pair,
            collision,
            i,
            j;

        c.beginPath();

        // render collision positions
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            collision = pair.collision;
            for (j = 0; j < pair.activeContacts.length; j++) {
                var contact = pair.activeContacts[j],
                    vertex = contact.vertex;
                c.rect(vertex.x - 1.5, vertex.y - 1.5, 3.5, 3.5);
            }
        }

        if (options.wireframes) {
            c.fillStyle = 'rgba(255,255,255,0.7)';
        } else {
            c.fillStyle = 'orange';
        }
        c.fill();

        c.beginPath();
            
        // render collision normals
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            collision = pair.collision;

            if (pair.activeContacts.length > 0) {
                var normalPosX = pair.activeContacts[0].vertex.x,
                    normalPosY = pair.activeContacts[0].vertex.y;

                if (pair.activeContacts.length === 2) {
                    normalPosX = (pair.activeContacts[0].vertex.x + pair.activeContacts[1].vertex.x) / 2;
                    normalPosY = (pair.activeContacts[0].vertex.y + pair.activeContacts[1].vertex.y) / 2;
                }
                
                c.moveTo(normalPosX - collision.normal.x * 8, normalPosY - collision.normal.y * 8);
                c.lineTo(normalPosX, normalPosY);
            }
        }

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,165,0,0.7)';
        } else {
            c.strokeStyle = 'orange';
        }

        c.lineWidth = 1;
        c.stroke();
    };

    /**
     * Description
     * @method grid
     * @param {engine} engine
     * @param {grid} grid
     * @param {RenderingContext} context
     */
    Render.grid = function(engine, grid, context) {
        var c = context,
            options = engine.render.options;

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,180,0,0.1)';
        } else {
            c.strokeStyle = 'rgba(255,180,0,0.5)';
        }

        c.beginPath();

        var bucketKeys = Common.keys(grid.buckets);

        for (var i = 0; i < bucketKeys.length; i++) {
            var bucketId = bucketKeys[i];

            if (grid.buckets[bucketId].length < 2)
                continue;

            var region = bucketId.split(',');
            c.rect(0.5 + parseInt(region[0], 10) * grid.bucketWidth, 
                    0.5 + parseInt(region[1], 10) * grid.bucketHeight, 
                    grid.bucketWidth, 
                    grid.bucketHeight);
        }

        c.lineWidth = 1;
        c.stroke();
    };

    /**
     * Description
     * @method inspector
     * @param {inspector} inspector
     * @param {RenderingContext} context
     */
    Render.inspector = function(inspector, context) {
        var engine = inspector.engine,
            mouse = engine.input.mouse,
            selected = inspector.selected,
            c = context,
            render = engine.render,
            options = render.options,
            bounds;

        if (options.hasBounds) {
            var boundsWidth = render.bounds.max.x - render.bounds.min.x,
                boundsHeight = render.bounds.max.y - render.bounds.min.y,
                boundsScaleX = boundsWidth / render.options.width,
                boundsScaleY = boundsHeight / render.options.height;
            
            context.scale(1 / boundsScaleX, 1 / boundsScaleY);
            context.translate(-render.bounds.min.x, -render.bounds.min.y);
        }

        for (var i = 0; i < selected.length; i++) {
            var item = selected[i].data;

            context.translate(0.5, 0.5);
            context.lineWidth = 1;
            context.strokeStyle = 'rgba(255,165,0,0.9)';
            context.setLineDash([1,2]);

            switch (item.type) {

            case 'body':

                // render body selections
                bounds = item.bounds;
                context.beginPath();
                context.rect(Math.floor(bounds.min.x - 3), Math.floor(bounds.min.y - 3), 
                             Math.floor(bounds.max.x - bounds.min.x + 6), Math.floor(bounds.max.y - bounds.min.y + 6));
                context.closePath();
                context.stroke();

                break;

            case 'constraint':

                // render constraint selections
                var point = item.pointA;
                if (item.bodyA)
                    point = item.pointB;
                context.beginPath();
                context.arc(point.x, point.y, 10, 0, 2 * Math.PI);
                context.closePath();
                context.stroke();

                break;

            }

            context.setLineDash([0]);
            context.translate(-0.5, -0.5);
        }

        // render selection region
        if (inspector.selectStart !== null) {
            context.translate(0.5, 0.5);
            context.lineWidth = 1;
            context.strokeStyle = 'rgba(255,165,0,0.6)';
            context.fillStyle = 'rgba(255,165,0,0.1)';
            bounds = inspector.selectBounds;
            context.beginPath();
            context.rect(Math.floor(bounds.min.x), Math.floor(bounds.min.y), 
                         Math.floor(bounds.max.x - bounds.min.x), Math.floor(bounds.max.y - bounds.min.y));
            context.closePath();
            context.stroke();
            context.fill();
            context.translate(-0.5, -0.5);
        }

        if (options.hasBounds)
            context.setTransform(1, 0, 0, 1, 0, 0);
    };

    /**
     * Description
     * @method _createCanvas
     * @private
     * @param {} width
     * @param {} height
     * @return canvas
     */
    var _createCanvas = function(width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.oncontextmenu = function() { return false; };
        canvas.onselectstart = function() { return false; };
        return canvas;
    };

    /**
     * Gets the requested texture (an Image) via its path
     * @method _getTexture
     * @private
     * @param {render} render
     * @param {string} imagePath
     * @return {Image} texture
     */
    var _getTexture = function(render, imagePath) {
        var image = render.textures[imagePath];

        if (image)
            return image;

        image = render.textures[imagePath] = new Image();
        image.src = imagePath;

        return image;
    };

})();

;   // End src/render/Render.js


// Begin src/render/RenderPixi.js

/**
* See [Demo.js](https://github.com/liabru/matter-js/blob/master/demo/js/Demo.js) 
* and [DemoMobile.js](https://github.com/liabru/matter-js/blob/master/demo/js/DemoMobile.js) for usage examples.
*
* @class RenderPixi
*/

var RenderPixi = {};

(function() {
    
    /**
     * Creates a new Pixi.js WebGL renderer
     * @method create
     * @param {object} options
     * @return {RenderPixi} A new renderer
     */
    RenderPixi.create = function(options) {
        var defaults = {
            controller: RenderPixi,
            element: null,
            canvas: null,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                background: '#fafafa',
                wireframeBackground: '#222',
                enabled: true,
                wireframes: true,
                showSleeping: true,
                showDebug: false,
                showBroadphase: false,
                showBounds: false,
                showVelocity: false,
                showCollisions: false,
                showAxes: false,
                showPositions: false,
                showAngleIndicator: false,
                showIds: false,
                showShadows: false
            }
        };

        var render = Common.extend(defaults, options);

        // init pixi
        render.context = new PIXI.WebGLRenderer(window.innerWidth, window.innerHeight, render.canvas, false, true);
        render.canvas = render.context.view;
        render.stage = new PIXI.Stage();

        // caches
        render.textures = {};
        render.sprites = {};
        render.primitives = {};

        // use a sprite batch for performance
        render.spriteBatch = new PIXI.SpriteBatch();
        render.stage.addChild(render.spriteBatch);

        // insert canvas
        if (Common.isElement(render.element)) {
            render.element.appendChild(render.canvas);
        } else {
            Common.log('No "render.element" passed, "render.canvas" was not inserted into document.', 'warn');
        }

        // prevent menus on canvas
        render.canvas.oncontextmenu = function() { return false; };
        render.canvas.onselectstart = function() { return false; };

        return render;
    };

    /**
     * Clears the scene graph
     * @method clear
     * @param {RenderPixi} render
     */
    RenderPixi.clear = function(render) {
        var stage = render.stage,
            spriteBatch = render.spriteBatch;

        // clear stage
        while (stage.children[0]) { 
            stage.removeChild(stage.children[0]); 
        }

        // clear sprite batch
        while (spriteBatch.children[0]) { 
            spriteBatch.removeChild(spriteBatch.children[0]); 
        }

        var bgSprite = render.sprites['bg-0'];

        // clear caches
        render.textures = {};
        render.sprites = {};
        render.primitives = {};

        // set background sprite
        render.sprites['bg-0'] = bgSprite;
        if (bgSprite)
            spriteBatch.addChildAt(bgSprite, 0);

        // add sprite batch back into stage
        render.stage.addChild(render.spriteBatch);

        // reset background state
        render.currentBackground = null;
    };

    /**
     * Sets the background of the canvas 
     * @method setBackground
     * @param {RenderPixi} render
     * @param {string} background
     */
    RenderPixi.setBackground = function(render, background) {
        if (render.currentBackground !== background) {
            var isColor = background.indexOf && background.indexOf('#') !== -1,
                bgSprite = render.sprites['bg-0'];

            if (isColor) {
                // if solid background color
                var color = Common.colorToNumber(background);
                render.stage.setBackgroundColor(color);

                // remove background sprite if existing
                if (bgSprite)
                    render.spriteBatch.removeChild(bgSprite); 
            } else {
                // initialise background sprite if needed
                if (!bgSprite) {
                    var texture = _getTexture(render, background);

                    bgSprite = render.sprites['bg-0'] = new PIXI.Sprite(texture);
                    bgSprite.position.x = 0;
                    bgSprite.position.y = 0;
                    render.spriteBatch.addChildAt(bgSprite, 0);
                }
            }

            render.currentBackground = background;
        }
    };

    /**
     * Description
     * @method world
     * @param {engine} engine
     */
    RenderPixi.world = function(engine) {
        var render = engine.render,
            world = engine.world,
            context = render.context,
            stage = render.stage,
            options = render.options,
            bodies = Composite.allBodies(world),
            constraints = Composite.allConstraints(world),
            i;

        if (options.wireframes) {
            RenderPixi.setBackground(render, options.wireframeBackground);
        } else {
            RenderPixi.setBackground(render, options.background);
        }

        for (i = 0; i < bodies.length; i++)
            RenderPixi.body(engine, bodies[i]);

        for (i = 0; i < constraints.length; i++)
            RenderPixi.constraint(engine, constraints[i]);

        context.render(stage);
    };


    /**
     * Description
     * @method constraint
     * @param {engine} engine
     * @param {constraint} constraint
     */
    RenderPixi.constraint = function(engine, constraint) {
        var render = engine.render,
            bodyA = constraint.bodyA,
            bodyB = constraint.bodyB,
            pointA = constraint.pointA,
            pointB = constraint.pointB,
            stage = render.stage,
            constraintRender = constraint.render,
            primitiveId = 'c-' + constraint.id,
            primitive = render.primitives[primitiveId];

        // initialise constraint primitive if not existing
        if (!primitive)
            primitive = render.primitives[primitiveId] = new PIXI.Graphics();

        // don't render if constraint does not have two end points
        if (!constraintRender.visible || !constraint.pointA || !constraint.pointB) {
            primitive.clear();
            return;
        }

        // add to scene graph if not already there
        if (stage.children.indexOf(primitive) === -1)
            stage.addChild(primitive);

        // render the constraint on every update, since they can change dynamically
        primitive.clear();
        primitive.beginFill(0, 0);
        primitive.lineStyle(constraintRender.lineWidth, Common.colorToNumber(constraintRender.strokeStyle), 1);
        
        if (bodyA) {
            primitive.moveTo(bodyA.position.x + pointA.x, bodyA.position.y + pointA.y);
        } else {
            primitive.moveTo(pointA.x, pointA.y);
        }

        if (bodyB) {
            primitive.lineTo(bodyB.position.x + pointB.x, bodyB.position.y + pointB.y);
        } else {
            primitive.lineTo(pointB.x, pointB.y);
        }

        primitive.endFill();
    };
    
    /**
     * Description
     * @method body
     * @param {engine} engine
     * @param {body} body
     */
    RenderPixi.body = function(engine, body) {
        var render = engine.render,
            bodyRender = body.render;

        if (!bodyRender.visible)
            return;

        if (bodyRender.sprite && bodyRender.sprite.texture) {
            var spriteId = 'b-' + body.id,
                sprite = render.sprites[spriteId],
                spriteBatch = render.spriteBatch;

            // initialise body sprite if not existing
            if (!sprite)
                sprite = render.sprites[spriteId] = _createBodySprite(render, body);

            // add to scene graph if not already there
            if (spriteBatch.children.indexOf(sprite) === -1)
                spriteBatch.addChild(sprite);

            // update body sprite
            sprite.position.x = body.position.x;
            sprite.position.y = body.position.y;
            sprite.rotation = body.angle;
        } else {
            var primitiveId = 'b-' + body.id,
                primitive = render.primitives[primitiveId],
                stage = render.stage;

            // initialise body primitive if not existing
            if (!primitive) {
                primitive = render.primitives[primitiveId] = _createBodyPrimitive(render, body);
                primitive.initialAngle = body.angle;
            }

            // add to scene graph if not already there
            if (stage.children.indexOf(primitive) === -1)
                stage.addChild(primitive);

            // update body primitive
            primitive.position.x = body.position.x;
            primitive.position.y = body.position.y;
            primitive.rotation = body.angle - primitive.initialAngle;
        }
    };

    /**
     * Creates a body sprite
     * @method _createBodySprite
     * @private
     * @param {RenderPixi} render
     * @param {body} body
     * @return {PIXI.Sprite} sprite
     */
    var _createBodySprite = function(render, body) {
        var bodyRender = body.render,
            texturePath = bodyRender.sprite.texture,
            texture = _getTexture(render, texturePath),
            sprite = new PIXI.Sprite(texture);

        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;

        return sprite;
    };

    /**
     * Creates a body primitive
     * @method _createBodyPrimitive
     * @private
     * @param {RenderPixi} render
     * @param {body} body
     * @return {PIXI.Graphics} graphics
     */
    var _createBodyPrimitive = function(render, body) {
        var bodyRender = body.render,
            options = render.options,
            primitive = new PIXI.Graphics();

        primitive.clear();

        if (!options.wireframes) {
            primitive.beginFill(Common.colorToNumber(bodyRender.fillStyle), 1);
            primitive.lineStyle(body.render.lineWidth, Common.colorToNumber(bodyRender.strokeStyle), 1);
        } else {
            primitive.beginFill(0, 0);
            primitive.lineStyle(1, Common.colorToNumber('#bbb'), 1);
        }

        primitive.moveTo(body.vertices[0].x - body.position.x, body.vertices[0].y - body.position.y);

        for (var j = 1; j < body.vertices.length; j++) {
            primitive.lineTo(body.vertices[j].x - body.position.x, body.vertices[j].y - body.position.y);
        }

        primitive.lineTo(body.vertices[0].x - body.position.x, body.vertices[0].y - body.position.y);

        primitive.endFill();

        // angle indicator
        if (options.showAngleIndicator || options.showAxes) {
            primitive.beginFill(0, 0);

            if (options.wireframes) {
                primitive.lineStyle(1, Common.colorToNumber('#CD5C5C'), 1);
            } else {
                primitive.lineStyle(1, Common.colorToNumber(body.render.strokeStyle));
            }

            primitive.moveTo(0, 0);
            primitive.lineTo(((body.vertices[0].x + body.vertices[body.vertices.length-1].x) / 2) - body.position.x, 
                             ((body.vertices[0].y + body.vertices[body.vertices.length-1].y) / 2) - body.position.y);

            primitive.endFill();
        }

        return primitive;
    };

    /**
     * Gets the requested texture (a PIXI.Texture) via its path
     * @method _getTexture
     * @private
     * @param {RenderPixi} render
     * @param {string} imagePath
     * @return {PIXI.Texture} texture
     */
    var _getTexture = function(render, imagePath) {
        var texture = render.textures[imagePath];

        if (!texture)
            texture = render.textures[imagePath] = PIXI.Texture.fromImage(imagePath);

        return texture;
    };

})();

;   // End src/render/RenderPixi.js


// aliases

World.add = Composite.add;
World.remove = Composite.remove;
World.addComposite = Composite.addComposite;
World.addBody = Composite.addBody;
World.addConstraint = Composite.addConstraint;
World.clear = Composite.clear;

// exports

Matter.Body = Body;
Matter.Composite = Composite;
Matter.World = World;
Matter.Contact = Contact;
Matter.Detector = Detector;
Matter.Grid = Grid;
Matter.Pairs = Pairs;
Matter.Pair = Pair;
Matter.Resolver = Resolver;
Matter.SAT = SAT;
Matter.Constraint = Constraint;
Matter.MouseConstraint = MouseConstraint;
Matter.Common = Common;
Matter.Engine = Engine;
Matter.Metrics = Metrics;
Matter.Mouse = Mouse;
Matter.Sleeping = Sleeping;
Matter.Bodies = Bodies;
Matter.Composites = Composites;
Matter.Axes = Axes;
Matter.Bounds = Bounds;
Matter.Vector = Vector;
Matter.Vertices = Vertices;
Matter.Render = Render;
Matter.RenderPixi = RenderPixi;
Matter.Events = Events;
Matter.Query = Query;

// CommonJS module
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = Matter;
    }
    exports.Matter = Matter;
}

// AMD module
if (typeof define === 'function' && define.amd) {
    define('Matter', [], function () {
        return Matter;
    });
}

// browser
if (typeof window === 'object' && typeof window.document === 'object') {
    window.Matter = Matter;
}

// End Matter namespace closure

})();
/**
 * @license
 * pixi.js - v1.5.2
 * Copyright (c) 2012-2014, Mat Groves
 * http://goodboydigital.com/
 *
 * Compiled: 2014-03-31
 *
 * pixi.js is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license.php
 */
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

(function(){

    var root = this;

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * @module PIXI
 */
var PIXI = PIXI || {};

/* 
* 
* This file contains a lot of pixi consts which are used across the rendering engine
* @class Consts
*/
PIXI.WEBGL_RENDERER = 0;
PIXI.CANVAS_RENDERER = 1;

// useful for testing against if your lib is using pixi.
PIXI.VERSION = "v1.5.2";

// the various blend modes supported by pixi
PIXI.blendModes = {
    NORMAL:0,
    ADD:1,
    MULTIPLY:2,
    SCREEN:3,
    OVERLAY:4,
    DARKEN:5,
    LIGHTEN:6,
    COLOR_DODGE:7,
    COLOR_BURN:8,
    HARD_LIGHT:9,
    SOFT_LIGHT:10,
    DIFFERENCE:11,
    EXCLUSION:12,
    HUE:13,
    SATURATION:14,
    COLOR:15,
    LUMINOSITY:16
};

// the scale modes
PIXI.scaleModes = {
    DEFAULT:0,
    LINEAR:0,
    NEAREST:1
};

// interaction frequency 
PIXI.INTERACTION_FREQUENCY = 30;
PIXI.AUTO_PREVENT_DEFAULT = true;

PIXI.RAD_TO_DEG = 180 / Math.PI;
PIXI.DEG_TO_RAD = Math.PI / 180;
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The Point object represents a location in a two-dimensional coordinate system, where x represents the horizontal axis and y represents the vertical axis.
 *
 * @class Point
 * @constructor
 * @param x {Number} position of the point on the x axis
 * @param y {Number} position of the point on the y axis
 */
PIXI.Point = function(x, y)
{
    /**
     * @property x
     * @type Number
     * @default 0
     */
    this.x = x || 0;

    /**
     * @property y
     * @type Number
     * @default 0
     */
    this.y = y || 0;
};

/**
 * Creates a clone of this point
 *
 * @method clone
 * @return {Point} a copy of the point
 */
PIXI.Point.prototype.clone = function()
{
    return new PIXI.Point(this.x, this.y);
};

// constructor
PIXI.Point.prototype.constructor = PIXI.Point;

PIXI.Point.prototype.set = function(x, y)
{
    this.x = x || 0;
    this.y = y || ( (y !== 0) ? this.x : 0 ) ;
};


/**
 * @author Mat Groves http://matgroves.com/
 */

/**
 * the Rectangle object is an area defined by its position, as indicated by its top-left corner point (x, y) and by its width and its height.
 *
 * @class Rectangle
 * @constructor
 * @param x {Number} The X coord of the upper-left corner of the rectangle
 * @param y {Number} The Y coord of the upper-left corner of the rectangle
 * @param width {Number} The overall width of this rectangle
 * @param height {Number} The overall height of this rectangle
 */
PIXI.Rectangle = function(x, y, width, height)
{
    /**
     * @property x
     * @type Number
     * @default 0
     */
    this.x = x || 0;

    /**
     * @property y
     * @type Number
     * @default 0
     */
    this.y = y || 0;

    /**
     * @property width
     * @type Number
     * @default 0
     */
    this.width = width || 0;

    /**
     * @property height
     * @type Number
     * @default 0
     */
    this.height = height || 0;
};

/**
 * Creates a clone of this Rectangle
 *
 * @method clone
 * @return {Rectangle} a copy of the rectangle
 */
PIXI.Rectangle.prototype.clone = function()
{
    return new PIXI.Rectangle(this.x, this.y, this.width, this.height);
};

/**
 * Checks whether the x and y coordinates passed to this function are contained within this Rectangle
 *
 * @method contains
 * @param x {Number} The X coordinate of the point to test
 * @param y {Number} The Y coordinate of the point to test
 * @return {Boolean} Whether the x/y coords are within this Rectangle
 */
PIXI.Rectangle.prototype.contains = function(x, y)
{
    if(this.width <= 0 || this.height <= 0)
        return false;

    var x1 = this.x;
    if(x >= x1 && x <= x1 + this.width)
    {
        var y1 = this.y;

        if(y >= y1 && y <= y1 + this.height)
        {
            return true;
        }
    }

    return false;
};

// constructor
PIXI.Rectangle.prototype.constructor = PIXI.Rectangle;

PIXI.EmptyRectangle = new PIXI.Rectangle(0,0,0,0);
/**
 * @author Adrien Brault <adrien.brault@gmail.com>
 */

/**
 * @class Polygon
 * @constructor
 * @param points* {Array<Point>|Array<Number>|Point...|Number...} This can be an array of Points that form the polygon,
 *      a flat array of numbers that will be interpreted as [x,y, x,y, ...], or the arguments passed can be
 *      all the points of the polygon e.g. `new PIXI.Polygon(new PIXI.Point(), new PIXI.Point(), ...)`, or the
 *      arguments passed can be flat x,y values e.g. `new PIXI.Polygon(x,y, x,y, x,y, ...)` where `x` and `y` are
 *      Numbers.
 */
PIXI.Polygon = function(points)
{
    //if points isn't an array, use arguments as the array
    if(!(points instanceof Array))
        points = Array.prototype.slice.call(arguments);

    //if this is a flat array of numbers, convert it to points
    if(typeof points[0] === 'number') {
        var p = [];
        for(var i = 0, il = points.length; i < il; i+=2) {
            p.push(
                new PIXI.Point(points[i], points[i + 1])
            );
        }

        points = p;
    }

    this.points = points;
};

/**
 * Creates a clone of this polygon
 *
 * @method clone
 * @return {Polygon} a copy of the polygon
 */
PIXI.Polygon.prototype.clone = function()
{
    var points = [];
    for (var i=0; i<this.points.length; i++) {
        points.push(this.points[i].clone());
    }

    return new PIXI.Polygon(points);
};

/**
 * Checks whether the x and y coordinates passed to this function are contained within this polygon
 *
 * @method contains
 * @param x {Number} The X coordinate of the point to test
 * @param y {Number} The Y coordinate of the point to test
 * @return {Boolean} Whether the x/y coordinates are within this polygon
 */
PIXI.Polygon.prototype.contains = function(x, y)
{
    var inside = false;

    // use some raycasting to test hits
    // https://github.com/substack/point-in-polygon/blob/master/index.js
    for(var i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
        var xi = this.points[i].x, yi = this.points[i].y,
            xj = this.points[j].x, yj = this.points[j].y,
            intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if(intersect) inside = !inside;
    }

    return inside;
};

// constructor
PIXI.Polygon.prototype.constructor = PIXI.Polygon;

/**
 * @author Chad Engler <chad@pantherdev.com>
 */

/**
 * The Circle object can be used to specify a hit area for displayObjects
 *
 * @class Circle
 * @constructor
 * @param x {Number} The X coordinate of the upper-left corner of the framing rectangle of this circle
 * @param y {Number} The Y coordinate of the upper-left corner of the framing rectangle of this circle
 * @param radius {Number} The radius of the circle
 */
PIXI.Circle = function(x, y, radius)
{
    /**
     * @property x
     * @type Number
     * @default 0
     */
    this.x = x || 0;

    /**
     * @property y
     * @type Number
     * @default 0
     */
    this.y = y || 0;

    /**
     * @property radius
     * @type Number
     * @default 0
     */
    this.radius = radius || 0;
};

/**
 * Creates a clone of this Circle instance
 *
 * @method clone
 * @return {Circle} a copy of the polygon
 */
PIXI.Circle.prototype.clone = function()
{
    return new PIXI.Circle(this.x, this.y, this.radius);
};

/**
 * Checks whether the x, and y coordinates passed to this function are contained within this circle
 *
 * @method contains
 * @param x {Number} The X coordinate of the point to test
 * @param y {Number} The Y coordinate of the point to test
 * @return {Boolean} Whether the x/y coordinates are within this polygon
 */
PIXI.Circle.prototype.contains = function(x, y)
{
    if(this.radius <= 0)
        return false;

    var dx = (this.x - x),
        dy = (this.y - y),
        r2 = this.radius * this.radius;

    dx *= dx;
    dy *= dy;

    return (dx + dy <= r2);
};

// constructor
PIXI.Circle.prototype.constructor = PIXI.Circle;


/**
 * @author Chad Engler <chad@pantherdev.com>
 */

/**
 * The Ellipse object can be used to specify a hit area for displayObjects
 *
 * @class Ellipse
 * @constructor
 * @param x {Number} The X coordinate of the upper-left corner of the framing rectangle of this ellipse
 * @param y {Number} The Y coordinate of the upper-left corner of the framing rectangle of this ellipse
 * @param width {Number} The overall width of this ellipse
 * @param height {Number} The overall height of this ellipse
 */
PIXI.Ellipse = function(x, y, width, height)
{
    /**
     * @property x
     * @type Number
     * @default 0
     */
    this.x = x || 0;

    /**
     * @property y
     * @type Number
     * @default 0
     */
    this.y = y || 0;

    /**
     * @property width
     * @type Number
     * @default 0
     */
    this.width = width || 0;

    /**
     * @property height
     * @type Number
     * @default 0
     */
    this.height = height || 0;
};

/**
 * Creates a clone of this Ellipse instance
 *
 * @method clone
 * @return {Ellipse} a copy of the ellipse
 */
PIXI.Ellipse.prototype.clone = function()
{
    return new PIXI.Ellipse(this.x, this.y, this.width, this.height);
};

/**
 * Checks whether the x and y coordinates passed to this function are contained within this ellipse
 *
 * @method contains
 * @param x {Number} The X coordinate of the point to test
 * @param y {Number} The Y coordinate of the point to test
 * @return {Boolean} Whether the x/y coords are within this ellipse
 */
PIXI.Ellipse.prototype.contains = function(x, y)
{
    if(this.width <= 0 || this.height <= 0)
        return false;

    //normalize the coords to an ellipse with center 0,0
    var normx = ((x - this.x) / this.width),
        normy = ((y - this.y) / this.height);

    normx *= normx;
    normy *= normy;

    return (normx + normy <= 1);
};

/**
* Returns the framing rectangle of the ellipse as a PIXI.Rectangle object
*
* @method getBounds
* @return {Rectangle} the framing rectangle
*/
PIXI.Ellipse.prototype.getBounds = function()
{
    return new PIXI.Rectangle(this.x, this.y, this.width, this.height);
};

// constructor
PIXI.Ellipse.prototype.constructor = PIXI.Ellipse;

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.determineMatrixArrayType = function() {
    return (typeof Float32Array !== 'undefined') ? Float32Array : Array;
};

/*
* @class Matrix2
* The Matrix2 class will choose the best type of array to use between
* a regular javascript Array and a Float32Array if the latter is available
*
*/
PIXI.Matrix2 = PIXI.determineMatrixArrayType();

/*
* @class Matrix
* The Matrix class is now an object, which makes it a lot faster, 
* here is a representation of it : 
* | a | b | tx|
* | c | c | ty|
* | 0 | 0 | 1 |
*
*/
PIXI.Matrix = function()
{
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.tx = 0;
    this.ty = 0;
};

/**
 * Creates a pixi matrix object based on the array given as a parameter
 *
 * @method fromArray
 * @param array {Array} The array that the matrix will be filled with
 */
PIXI.Matrix.prototype.fromArray = function(array)
{
    this.a = array[0];
    this.b = array[1];
    this.c = array[3];
    this.d = array[4];
    this.tx = array[2];
    this.ty = array[5];
};

/**
 * Creates an array from the current Matrix object
 *
 * @method toArray
 * @param transpose {Boolean} Whether we need to transpose the matrix or not
 * @return array {Array} the newly created array which contains the matrix
 */
PIXI.Matrix.prototype.toArray = function(transpose)
{
    if(!this.array) this.array = new Float32Array(9);
    var array = this.array;

    if(transpose)
    {
        this.array[0] = this.a;
        this.array[1] = this.c;
        this.array[2] = 0;
        this.array[3] = this.b;
        this.array[4] = this.d;
        this.array[5] = 0;
        this.array[6] = this.tx;
        this.array[7] = this.ty;
        this.array[8] = 1;
    }
    else
    {
        this.array[0] = this.a;
        this.array[1] = this.b;
        this.array[2] = this.tx;
        this.array[3] = this.c;
        this.array[4] = this.d;
        this.array[5] = this.ty;
        this.array[6] = 0;
        this.array[7] = 0;
        this.array[8] = 1;
    }

    return array;//[this.a, this.b, this.tx, this.c, this.d, this.ty, 0, 0, 1];
};

PIXI.identityMatrix = new PIXI.Matrix();
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The base class for all objects that are rendered on the screen.
 *
 * @class DisplayObject
 * @constructor
 */
PIXI.DisplayObject = function()
{
    /**
     * The coordinate of the object relative to the local coordinates of the parent.
     *
     * @property position
     * @type Point
     */
    this.position = new PIXI.Point();

    /**
     * The scale factor of the object.
     *
     * @property scale
     * @type Point
     */
    this.scale = new PIXI.Point(1,1);//{x:1, y:1};

    /**
     * The pivot point of the displayObject that it rotates around
     *
     * @property pivot
     * @type Point
     */
    this.pivot = new PIXI.Point(0,0);

    /**
     * The rotation of the object in radians.
     *
     * @property rotation
     * @type Number
     */
    this.rotation = 0;

    /**
     * The opacity of the object.
     *
     * @property alpha
     * @type Number
     */
    this.alpha = 1;

    /**
     * The visibility of the object.
     *
     * @property visible
     * @type Boolean
     */
    this.visible = true;

    /**
     * This is the defined area that will pick up mouse / touch events. It is null by default.
     * Setting it is a neat way of optimising the hitTest function that the interactionManager will use (as it will not need to hit test all the children)
     *
     * @property hitArea
     * @type Rectangle|Circle|Ellipse|Polygon
     */
    this.hitArea = null;

    /**
     * This is used to indicate if the displayObject should display a mouse hand cursor on rollover
     *
     * @property buttonMode
     * @type Boolean
     */
    this.buttonMode = false;

    /**
     * Can this object be rendered
     *
     * @property renderable
     * @type Boolean
     */
    this.renderable = false;

    /**
     * [read-only] The display object container that contains this display object.
     *
     * @property parent
     * @type DisplayObjectContainer
     * @readOnly
     */
    this.parent = null;

    /**
     * [read-only] The stage the display object is connected to, or undefined if it is not connected to the stage.
     *
     * @property stage
     * @type Stage
     * @readOnly
     */
    this.stage = null;

    /**
     * [read-only] The multiplied alpha of the displayObject
     *
     * @property worldAlpha
     * @type Number
     * @readOnly
     */
    this.worldAlpha = 1;

    /**
     * [read-only] Whether or not the object is interactive, do not toggle directly! use the `interactive` property
     *
     * @property _interactive
     * @type Boolean
     * @readOnly
     * @private
     */
    this._interactive = false;

    /**
     * This is the cursor that will be used when the mouse is over this object. To enable this the element must have interaction = true and buttonMode = true
     * 
     * @property defaultCursor
     * @type String
     *
    */
    this.defaultCursor = 'pointer';

    /**
     * [read-only] Current transform of the object based on world (parent) factors
     *
     * @property worldTransform
     * @type Mat3
     * @readOnly
     * @private
     */
    this.worldTransform = new PIXI.Matrix();

    /**
     * [NYI] Unknown
     *
     * @property color
     * @type Array<>
     * @private
     */
    this.color = [];

    /**
     * [NYI] Holds whether or not this object is dynamic, for rendering optimization
     *
     * @property dynamic
     * @type Boolean
     * @private
     */
    this.dynamic = true;

    // cached sin rotation and cos rotation
    this._sr = 0;
    this._cr = 1;

    /**
     * The area the filter is applied to like the hitArea this is used as more of an optimisation
     * rather than figuring out the dimensions of the displayObject each frame you can set this rectangle
     *
     * @property filterArea
     * @type Rectangle
     */
    this.filterArea = null;//new PIXI.Rectangle(0,0,1,1);

    /**
     * The original, cached bounds of the object
     *
     * @property _bounds
     * @type Rectangle
     * @private
     */
    this._bounds = new PIXI.Rectangle(0, 0, 1, 1);
    /**
     * The most up-to-date bounds of the object
     *
     * @property _currentBounds
     * @type Rectangle
     * @private
     */
    this._currentBounds = null;
    /**
     * The original, cached mask of the object
     *
     * @property _currentBounds
     * @type Rectangle
     * @private
     */
    this._mask = null;

    this._cacheAsBitmap = false;
    this._cacheIsDirty = false;


    /*
     * MOUSE Callbacks
     */

    /**
     * A callback that is used when the users clicks on the displayObject with their mouse
     * @method click
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user clicks the mouse down over the sprite
     * @method mousedown
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user releases the mouse that was over the displayObject
     * for this callback to be fired the mouse must have been pressed down over the displayObject
     * @method mouseup
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user releases the mouse that was over the displayObject but is no longer over the displayObject
     * for this callback to be fired, The touch must have started over the displayObject
     * @method mouseupoutside
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the users mouse rolls over the displayObject
     * @method mouseover
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the users mouse leaves the displayObject
     * @method mouseout
     * @param interactionData {InteractionData}
     */


    /*
     * TOUCH Callbacks
     */

    /**
     * A callback that is used when the users taps on the sprite with their finger
     * basically a touch version of click
     * @method tap
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user touches over the displayObject
     * @method touchstart
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user releases a touch over the displayObject
     * @method touchend
     * @param interactionData {InteractionData}
     */

    /**
     * A callback that is used when the user releases the touch that was over the displayObject
     * for this callback to be fired, The touch must have started over the sprite
     * @method touchendoutside
     * @param interactionData {InteractionData}
     */
};

// constructor
PIXI.DisplayObject.prototype.constructor = PIXI.DisplayObject;

/**
 * [Deprecated] Indicates if the sprite will have touch and mouse interactivity. It is false by default
 * Instead of using this function you can now simply set the interactive property to true or false
 *
 * @method setInteractive
 * @param interactive {Boolean}
 * @deprecated Simply set the `interactive` property directly
 */
PIXI.DisplayObject.prototype.setInteractive = function(interactive)
{
    this.interactive = interactive;
};

/**
 * Indicates if the sprite will have touch and mouse interactivity. It is false by default
 *
 * @property interactive
 * @type Boolean
 * @default false
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'interactive', {
    get: function() {
        return this._interactive;
    },
    set: function(value) {
        this._interactive = value;

        // TODO more to be done here..
        // need to sort out a re-crawl!
        if(this.stage)this.stage.dirty = true;
    }
});

/**
 * [read-only] Indicates if the sprite is globaly visible.
 *
 * @property worldVisible
 * @type Boolean
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'worldVisible', {
    get: function() {
        var item = this;

        do
        {
            if(!item.visible)return false;
            item = item.parent;
        }
        while(item);

        return true;
    }
});

/**
 * Sets a mask for the displayObject. A mask is an object that limits the visibility of an object to the shape of the mask applied to it.
 * In PIXI a regular mask must be a PIXI.Graphics object. This allows for much faster masking in canvas as it utilises shape clipping.
 * To remove a mask, set this property to null.
 *
 * @property mask
 * @type Graphics
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'mask', {
    get: function() {
        return this._mask;
    },
    set: function(value) {

        if(this._mask)this._mask.isMask = false;
        this._mask = value;
        if(this._mask)this._mask.isMask = true;
    }
});

/**
 * Sets the filters for the displayObject.
 * * IMPORTANT: This is a webGL only feature and will be ignored by the canvas renderer.
 * To remove filters simply set this property to 'null'
 * @property filters
 * @type Array An array of filters
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'filters', {
    get: function() {
        return this._filters;
    },
    set: function(value) {

        if(value)
        {
            // now put all the passes in one place..
            var passes = [];
            for (var i = 0; i < value.length; i++)
            {
                var filterPasses = value[i].passes;
                for (var j = 0; j < filterPasses.length; j++)
                {
                    passes.push(filterPasses[j]);
                }
            }

            // TODO change this as it is legacy
            this._filterBlock = {target:this, filterPasses:passes};
        }

        this._filters = value;
    }
});

/**
 * Set weather or not a the display objects is cached as a bitmap.
 * This basically takes a snap shot of the display object as it is at that moment. It can provide a performance benefit for complex static displayObjects
 * To remove filters simply set this property to 'null'
 * @property cacheAsBitmap
 * @type Boolean
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'cacheAsBitmap', {
    get: function() {
        return  this._cacheAsBitmap;
    },
    set: function(value) {

        if(this._cacheAsBitmap === value)return;

        if(value)
        {
            //this._cacheIsDirty = true;
            this._generateCachedSprite();
        }
        else
        {
            this._destroyCachedSprite();
        }

        this._cacheAsBitmap = value;
    }
});

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.DisplayObject.prototype.updateTransform = function()
{
    // TODO OPTIMIZE THIS!! with dirty
    if(this.rotation !== this.rotationCache)
    {

        this.rotationCache = this.rotation;
        this._sr =  Math.sin(this.rotation);
        this._cr =  Math.cos(this.rotation);
    }

   // var localTransform = this.localTransform//.toArray();
    var parentTransform = this.parent.worldTransform;//.toArray();
    var worldTransform = this.worldTransform;//.toArray();

    var px = this.pivot.x;
    var py = this.pivot.y;

    var a00 = this._cr * this.scale.x,
        a01 = -this._sr * this.scale.y,
        a10 = this._sr * this.scale.x,
        a11 = this._cr * this.scale.y,
        a02 = this.position.x - a00 * px - py * a01,
        a12 = this.position.y - a11 * py - px * a10,
        b00 = parentTransform.a, b01 = parentTransform.b,
        b10 = parentTransform.c, b11 = parentTransform.d;

    worldTransform.a = b00 * a00 + b01 * a10;
    worldTransform.b = b00 * a01 + b01 * a11;
    worldTransform.tx = b00 * a02 + b01 * a12 + parentTransform.tx;

    worldTransform.c = b10 * a00 + b11 * a10;
    worldTransform.d = b10 * a01 + b11 * a11;
    worldTransform.ty = b10 * a02 + b11 * a12 + parentTransform.ty;

    this.worldAlpha = this.alpha * this.parent.worldAlpha;
};

/**
 * Retrieves the bounds of the displayObject as a rectangle object
 *
 * @method getBounds
 * @return {Rectangle} the rectangular bounding area
 */
PIXI.DisplayObject.prototype.getBounds = function( matrix )
{
    matrix = matrix;//just to get passed js hinting (and preserve inheritance)
    return PIXI.EmptyRectangle;
};

/**
 * Retrieves the local bounds of the displayObject as a rectangle object
 *
 * @method getLocalBounds
 * @return {Rectangle} the rectangular bounding area
 */
PIXI.DisplayObject.prototype.getLocalBounds = function()
{
    return this.getBounds(PIXI.identityMatrix);///PIXI.EmptyRectangle();
};


/**
 * Sets the object's stage reference, the stage this object is connected to
 *
 * @method setStageReference
 * @param stage {Stage} the stage that the object will have as its current stage reference
 */
PIXI.DisplayObject.prototype.setStageReference = function(stage)
{
    this.stage = stage;
    if(this._interactive)this.stage.dirty = true;
};

PIXI.DisplayObject.prototype.generateTexture = function(renderer)
{
    var bounds = this.getLocalBounds();

    var renderTexture = new PIXI.RenderTexture(bounds.width | 0, bounds.height | 0, renderer);
    renderTexture.render(this, new PIXI.Point(-bounds.x, -bounds.y) );

    return renderTexture;
};

PIXI.DisplayObject.prototype.updateCache = function()
{
    this._generateCachedSprite();
};

PIXI.DisplayObject.prototype._renderCachedSprite = function(renderSession)
{
    if(renderSession.gl)
    {
        PIXI.Sprite.prototype._renderWebGL.call(this._cachedSprite, renderSession);
    }
    else
    {
        PIXI.Sprite.prototype._renderCanvas.call(this._cachedSprite, renderSession);
    }
};

PIXI.DisplayObject.prototype._generateCachedSprite = function()//renderSession)
{
    this._cacheAsBitmap = false;
    var bounds = this.getLocalBounds();
   
    if(!this._cachedSprite)
    {
        var renderTexture = new PIXI.RenderTexture(bounds.width | 0, bounds.height | 0);//, renderSession.renderer);
        
        this._cachedSprite = new PIXI.Sprite(renderTexture);
        this._cachedSprite.worldTransform = this.worldTransform;
    }
    else
    {
        this._cachedSprite.texture.resize(bounds.width | 0, bounds.height | 0);
    }

    //REMOVE filter!
    var tempFilters = this._filters;
    this._filters = null;

    this._cachedSprite.filters = tempFilters;
    this._cachedSprite.texture.render(this, new PIXI.Point(-bounds.x, -bounds.y) );

    this._filters = tempFilters;

    this._cacheAsBitmap = true;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.DisplayObject.prototype._destroyCachedSprite = function()
{
    if(!this._cachedSprite)return;

    this._cachedSprite.texture.destroy(true);
  //  console.log("DESTROY")
    // let the gc collect the unused sprite
    // TODO could be object pooled!
    this._cachedSprite = null;
};


PIXI.DisplayObject.prototype._renderWebGL = function(renderSession)
{
    // OVERWRITE;
    // this line is just here to pass jshinting :)
    renderSession = renderSession;
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.DisplayObject.prototype._renderCanvas = function(renderSession)
{
    // OVERWRITE;
    // this line is just here to pass jshinting :)
    renderSession = renderSession;
};

/**
 * The position of the displayObject on the x axis relative to the local coordinates of the parent.
 *
 * @property x
 * @type Number
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'x', {
    get: function() {
        return  this.position.x;
    },
    set: function(value) {
        this.position.x = value;
    }
});

/**
 * The position of the displayObject on the y axis relative to the local coordinates of the parent.
 *
 * @property y
 * @type Number
 */
Object.defineProperty(PIXI.DisplayObject.prototype, 'y', {
    get: function() {
        return  this.position.y;
    },
    set: function(value) {
        this.position.y = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


/**
 * A DisplayObjectContainer represents a collection of display objects.
 * It is the base class of all display objects that act as a container for other objects.
 *
 * @class DisplayObjectContainer
 * @extends DisplayObject
 * @constructor
 */
PIXI.DisplayObjectContainer = function()
{
    PIXI.DisplayObject.call( this );

    /**
     * [read-only] The array of children of this container.
     *
     * @property children
     * @type Array<DisplayObject>
     * @readOnly
     */
    this.children = [];
};

// constructor
PIXI.DisplayObjectContainer.prototype = Object.create( PIXI.DisplayObject.prototype );
PIXI.DisplayObjectContainer.prototype.constructor = PIXI.DisplayObjectContainer;

/**
 * The width of the displayObjectContainer, setting this will actually modify the scale to achieve the value set
 *
 * @property width
 * @type Number
 */

 /*
Object.defineProperty(PIXI.DisplayObjectContainer.prototype, 'width', {
    get: function() {
        return this.scale.x * this.getLocalBounds().width;
    },
    set: function(value) {
        this.scale.x = value / (this.getLocalBounds().width/this.scale.x);
        this._width = value;
    }
});
*/

/**
 * The height of the displayObjectContainer, setting this will actually modify the scale to achieve the value set
 *
 * @property height
 * @type Number
 */

/*
Object.defineProperty(PIXI.DisplayObjectContainer.prototype, 'height', {
    get: function() {
        return  this.scale.y * this.getLocalBounds().height;
    },
    set: function(value) {
        this.scale.y = value / (this.getLocalBounds().height/this.scale.y);
        this._height = value;
    }
});
*/

/**
 * Adds a child to the container.
 *
 * @method addChild
 * @param child {DisplayObject} The DisplayObject to add to the container
 */
PIXI.DisplayObjectContainer.prototype.addChild = function(child)
{
    this.addChildAt(child, this.children.length);
};

/**
 * Adds a child to the container at a specified index. If the index is out of bounds an error will be thrown
 *
 * @method addChildAt
 * @param child {DisplayObject} The child to add
 * @param index {Number} The index to place the child in
 */
PIXI.DisplayObjectContainer.prototype.addChildAt = function(child, index)
{
    if(index >= 0 && index <= this.children.length)
    {
        if(child.parent)
        {
            child.parent.removeChild(child);
        }

        child.parent = this;

        this.children.splice(index, 0, child);

        if(this.stage)child.setStageReference(this.stage);
    }
    else
    {
        throw new Error(child + ' The index '+ index +' supplied is out of bounds ' + this.children.length);
    }
};

/**
 * [NYI] Swaps the depth of 2 displayObjects
 *
 * @method swapChildren
 * @param child {DisplayObject}
 * @param child2 {DisplayObject}
 * @private
 */
PIXI.DisplayObjectContainer.prototype.swapChildren = function(child, child2)
{
    if(child === child2) {
        return;
    }

    var index1 = this.children.indexOf(child);
    var index2 = this.children.indexOf(child2);

    if(index1 < 0 || index2 < 0) {
        throw new Error('swapChildren: Both the supplied DisplayObjects must be a child of the caller.');
    }

    this.children[index1] = child2;
    this.children[index2] = child;
    
};

/**
 * Returns the child at the specified index
 *
 * @method getChildAt
 * @param index {Number} The index to get the child from
 */
PIXI.DisplayObjectContainer.prototype.getChildAt = function(index)
{
    if(index >= 0 && index < this.children.length)
    {
        return this.children[index];
    }
    else
    {
        throw new Error('Supplied index does not exist in the child list, or the supplied DisplayObject must be a child of the caller');
    }
};

/**
 * Removes a child from the container.
 *
 * @method removeChild
 * @param child {DisplayObject} The DisplayObject to remove
 */
PIXI.DisplayObjectContainer.prototype.removeChild = function(child)
{
    return this.removeChildAt( this.children.indexOf( child ) );
};

/**
 * Removes a child from the specified index position in the child list of the container.
 *
 * @method removeChildAt
 * @param index {Number} The index to get the child from
 */
PIXI.DisplayObjectContainer.prototype.removeChildAt = function(index)
{
    var child = this.getChildAt( index );
    if(this.stage)
        child.removeStageReference();

    child.parent = undefined;
    this.children.splice( index, 1 );
    return child;
};

/**
* Removes all child instances from the child list of the container.
*
* @method removeChildren
* @param beginIndex {Number} The beginning position. Predefined value is 0.
* @param endIndex {Number} The ending position. Predefined value is children's array length.
*/
PIXI.DisplayObjectContainer.prototype.removeChildren = function(beginIndex, endIndex)
{
    var begin = beginIndex || 0;
    var end = typeof endIndex === 'number' ? endIndex : this.children.length;
    var range = end - begin;

    if (range > 0 && range <= end)
    {
        var removed = this.children.splice(begin, range);
        for (var i = 0; i < removed.length; i++) {
            var child = removed[i];
            if(this.stage)
                child.removeStageReference();
            child.parent = undefined;
        }
        return removed;
    }
    else
    {
        throw new Error( 'Range Error, numeric values are outside the acceptable range' );
    }
};

/*
 * Updates the container's childrens transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.DisplayObjectContainer.prototype.updateTransform = function()
{
    //this._currentBounds = null;

    if(!this.visible)return;

    PIXI.DisplayObject.prototype.updateTransform.call( this );

    if(this._cacheAsBitmap)return;

    for(var i=0,j=this.children.length; i<j; i++)
    {
        this.children[i].updateTransform();
    }
};

/**
 * Retrieves the bounds of the displayObjectContainer as a rectangle object
 *
 * @method getBounds
 * @return {Rectangle} the rectangular bounding area
 */
PIXI.DisplayObjectContainer.prototype.getBounds = function(matrix)
{
    if(this.children.length === 0)return PIXI.EmptyRectangle;

    // TODO the bounds have already been calculated this render session so return what we have
    if(matrix)
    {
        var matrixCache = this.worldTransform;
        this.worldTransform = matrix;
        this.updateTransform();
        this.worldTransform = matrixCache;
    }

    var minX = Infinity;
    var minY = Infinity;

    var maxX = -Infinity;
    var maxY = -Infinity;

    var childBounds;
    var childMaxX;
    var childMaxY;

    var childVisible = false;

    for(var i=0,j=this.children.length; i<j; i++)
    {
        var child = this.children[i];
        
        if(!child.visible)continue;

        childVisible = true;

        childBounds = this.children[i].getBounds( matrix );
     
        minX = minX < childBounds.x ? minX : childBounds.x;
        minY = minY < childBounds.y ? minY : childBounds.y;

        childMaxX = childBounds.width + childBounds.x;
        childMaxY = childBounds.height + childBounds.y;

        maxX = maxX > childMaxX ? maxX : childMaxX;
        maxY = maxY > childMaxY ? maxY : childMaxY;
    }

    if(!childVisible)
        return PIXI.EmptyRectangle;

    var bounds = this._bounds;

    bounds.x = minX;
    bounds.y = minY;
    bounds.width = maxX - minX;
    bounds.height = maxY - minY;

    // TODO: store a reference so that if this function gets called again in the render cycle we do not have to recalculate
    //this._currentBounds = bounds;
   
    return bounds;
};

PIXI.DisplayObjectContainer.prototype.getLocalBounds = function()
{
    var matrixCache = this.worldTransform;

    this.worldTransform = PIXI.identityMatrix;

    for(var i=0,j=this.children.length; i<j; i++)
    {
        this.children[i].updateTransform();
    }

    var bounds = this.getBounds();

    this.worldTransform = matrixCache;

    return bounds;
};

/**
 * Sets the container's stage reference, the stage this object is connected to
 *
 * @method setStageReference
 * @param stage {Stage} the stage that the container will have as its current stage reference
 */
PIXI.DisplayObjectContainer.prototype.setStageReference = function(stage)
{
    this.stage = stage;
    if(this._interactive)this.stage.dirty = true;

    for(var i=0,j=this.children.length; i<j; i++)
    {
        var child = this.children[i];
        child.setStageReference(stage);
    }
};

/**
 * removes the current stage reference of the container
 *
 * @method removeStageReference
 */
PIXI.DisplayObjectContainer.prototype.removeStageReference = function()
{

    for(var i=0,j=this.children.length; i<j; i++)
    {
        var child = this.children[i];
        child.removeStageReference();
    }

    if(this._interactive)this.stage.dirty = true;
    
    this.stage = null;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.DisplayObjectContainer.prototype._renderWebGL = function(renderSession)
{
    if(!this.visible || this.alpha <= 0)return;
    
    if(this._cacheAsBitmap)
    {
        this._renderCachedSprite(renderSession);
        return;
    }
    
    var i,j;

    if(this._mask || this._filters)
    {
        if(this._mask)
        {
            renderSession.spriteBatch.stop();
            renderSession.maskManager.pushMask(this.mask, renderSession);
            renderSession.spriteBatch.start();
        }

        if(this._filters)
        {
            renderSession.spriteBatch.flush();
            renderSession.filterManager.pushFilter(this._filterBlock);
        }

        // simple render children!
        for(i=0,j=this.children.length; i<j; i++)
        {
            this.children[i]._renderWebGL(renderSession);
        }

        renderSession.spriteBatch.stop();

        if(this._filters)renderSession.filterManager.popFilter();
        if(this._mask)renderSession.maskManager.popMask(renderSession);
        
        renderSession.spriteBatch.start();
    }
    else
    {
        // simple render children!
        for(i=0,j=this.children.length; i<j; i++)
        {
            this.children[i]._renderWebGL(renderSession);
        }
    }
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.DisplayObjectContainer.prototype._renderCanvas = function(renderSession)
{
    if(this.visible === false || this.alpha === 0)return;

    if(this._cacheAsBitmap)
    {

        this._renderCachedSprite(renderSession);
        return;
    }

    if(this._mask)
    {
        renderSession.maskManager.pushMask(this._mask, renderSession.context);
    }

    for(var i=0,j=this.children.length; i<j; i++)
    {
        var child = this.children[i];
        child._renderCanvas(renderSession);
    }

    if(this._mask)
    {
        renderSession.maskManager.popMask(renderSession.context);
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The Sprite object is the base for all textured objects that are rendered to the screen
 *
 * @class Sprite
 * @extends DisplayObjectContainer
 * @constructor
 * @param texture {Texture} The texture for this sprite
 * 
 * A sprite can be created directly from an image like this : 
 * var sprite = nex PIXI.Sprite.FromImage('assets/image.png');
 * yourStage.addChild(sprite);
 * then obviously don't forget to add it to the stage you have already created
 */
PIXI.Sprite = function(texture)
{
    PIXI.DisplayObjectContainer.call( this );

    /**
     * The anchor sets the origin point of the texture.
     * The default is 0,0 this means the texture's origin is the top left
     * Setting than anchor to 0.5,0.5 means the textures origin is centred
     * Setting the anchor to 1,1 would mean the textures origin points will be the bottom right corner
     *
     * @property anchor
     * @type Point
     */
    this.anchor = new PIXI.Point();

    /**
     * The texture that the sprite is using
     *
     * @property texture
     * @type Texture
     */
    this.texture = texture;

    /**
     * The width of the sprite (this is initially set by the texture)
     *
     * @property _width
     * @type Number
     * @private
     */
    this._width = 0;

    /**
     * The height of the sprite (this is initially set by the texture)
     *
     * @property _height
     * @type Number
     * @private
     */
    this._height = 0;


    /**
     * The tint applied to the sprite. This is a hex value
     *
     * @property tint
     * @type Number
     * @default 0xFFFFFF
     */
    this.tint = 0xFFFFFF;// * Math.random();
    
    /**
     * The blend mode to be applied to the sprite
     *
     * @property blendMode
     * @type Number
     * @default PIXI.blendModes.NORMAL;
     */
    this.blendMode = PIXI.blendModes.NORMAL;

    if(texture.baseTexture.hasLoaded)
    {
        this.onTextureUpdate();
    }
    else
    {
        this.onTextureUpdateBind = this.onTextureUpdate.bind(this);
        this.texture.addEventListener( 'update', this.onTextureUpdateBind );
    }

    this.renderable = true;
};

// constructor
PIXI.Sprite.prototype = Object.create( PIXI.DisplayObjectContainer.prototype );
PIXI.Sprite.prototype.constructor = PIXI.Sprite;

/**
 * The width of the sprite, setting this will actually modify the scale to achieve the value set
 *
 * @property width
 * @type Number
 */
Object.defineProperty(PIXI.Sprite.prototype, 'width', {
    get: function() {
        return this.scale.x * this.texture.frame.width;
    },
    set: function(value) {
        this.scale.x = value / this.texture.frame.width;
        this._width = value;
    }
});

/**
 * The height of the sprite, setting this will actually modify the scale to achieve the value set
 *
 * @property height
 * @type Number
 */
Object.defineProperty(PIXI.Sprite.prototype, 'height', {
    get: function() {
        return  this.scale.y * this.texture.frame.height;
    },
    set: function(value) {
        this.scale.y = value / this.texture.frame.height;
        this._height = value;
    }
});

/**
 * Sets the texture of the sprite
 *
 * @method setTexture
 * @param texture {Texture} The PIXI texture that is displayed by the sprite
 */
PIXI.Sprite.prototype.setTexture = function(texture)
{
    // stop current texture;
    if(this.texture.baseTexture !== texture.baseTexture)
    {
        this.textureChange = true;
        this.texture = texture;
    }
    else
    {
        this.texture = texture;
    }

    this.cachedTint = 0xFFFFFF;
    this.updateFrame = true;
};

/**
 * When the texture is updated, this event will fire to update the scale and frame
 *
 * @method onTextureUpdate
 * @param event
 * @private
 */
PIXI.Sprite.prototype.onTextureUpdate = function()
{
    // so if _width is 0 then width was not set..
    if(this._width)this.scale.x = this._width / this.texture.frame.width;
    if(this._height)this.scale.y = this._height / this.texture.frame.height;


    this.updateFrame = true;
};

/**
* Returns the framing rectangle of the sprite as a PIXI.Rectangle object
*
* @method getBounds
* @param matrix {Matrix} the transformation matrix of the sprite
* @return {Rectangle} the framing rectangle
*/
PIXI.Sprite.prototype.getBounds = function(matrix)
{

    var width = this.texture.frame.width;
    var height = this.texture.frame.height;

    var w0 = width * (1-this.anchor.x);
    var w1 = width * -this.anchor.x;

    var h0 = height * (1-this.anchor.y);
    var h1 = height * -this.anchor.y;

    var worldTransform = matrix || this.worldTransform ;

    var a = worldTransform.a;
    var b = worldTransform.c;
    var c = worldTransform.b;
    var d = worldTransform.d;
    var tx = worldTransform.tx;
    var ty = worldTransform.ty;

    var x1 = a * w1 + c * h1 + tx;
    var y1 = d * h1 + b * w1 + ty;

    var x2 = a * w0 + c * h1 + tx;
    var y2 = d * h1 + b * w0 + ty;

    var x3 = a * w0 + c * h0 + tx;
    var y3 = d * h0 + b * w0 + ty;

    var x4 =  a * w1 + c * h0 + tx;
    var y4 =  d * h0 + b * w1 + ty;

    var maxX = -Infinity;
    var maxY = -Infinity;

    var minX = Infinity;
    var minY = Infinity;

    minX = x1 < minX ? x1 : minX;
    minX = x2 < minX ? x2 : minX;
    minX = x3 < minX ? x3 : minX;
    minX = x4 < minX ? x4 : minX;

    minY = y1 < minY ? y1 : minY;
    minY = y2 < minY ? y2 : minY;
    minY = y3 < minY ? y3 : minY;
    minY = y4 < minY ? y4 : minY;

    maxX = x1 > maxX ? x1 : maxX;
    maxX = x2 > maxX ? x2 : maxX;
    maxX = x3 > maxX ? x3 : maxX;
    maxX = x4 > maxX ? x4 : maxX;

    maxY = y1 > maxY ? y1 : maxY;
    maxY = y2 > maxY ? y2 : maxY;
    maxY = y3 > maxY ? y3 : maxY;
    maxY = y4 > maxY ? y4 : maxY;

    var bounds = this._bounds;

    bounds.x = minX;
    bounds.width = maxX - minX;

    bounds.y = minY;
    bounds.height = maxY - minY;

    // store a reference so that if this function gets called again in the render cycle we do not have to recalculate
    this._currentBounds = bounds;

    return bounds;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.Sprite.prototype._renderWebGL = function(renderSession)
{
    // if the sprite is not visible or the alpha is 0 then no need to render this element
    if(!this.visible || this.alpha <= 0)return;
    
    var i,j;

    // do a quick check to see if this element has a mask or a filter.
    if(this._mask || this._filters)
    {
        var spriteBatch =  renderSession.spriteBatch;

        if(this._mask)
        {
            spriteBatch.stop();
            renderSession.maskManager.pushMask(this.mask, renderSession);
            spriteBatch.start();
        }

        if(this._filters)
        {
            spriteBatch.flush();
            renderSession.filterManager.pushFilter(this._filterBlock);
        }

        // add this sprite to the batch
        spriteBatch.render(this);

        // now loop through the children and make sure they get rendered
        for(i=0,j=this.children.length; i<j; i++)
        {
            this.children[i]._renderWebGL(renderSession);
        }

        // time to stop the sprite batch as either a mask element or a filter draw will happen next
        spriteBatch.stop();

        if(this._filters)renderSession.filterManager.popFilter();
        if(this._mask)renderSession.maskManager.popMask(renderSession);
        
        spriteBatch.start();
    }
    else
    {
        renderSession.spriteBatch.render(this);

        // simple render children!
        for(i=0,j=this.children.length; i<j; i++)
        {
            this.children[i]._renderWebGL(renderSession);
        }
    }

   
    //TODO check culling  
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.Sprite.prototype._renderCanvas = function(renderSession)
{
    // if the sprite is not visible or the alpha is 0 then no need to render this element
    if(this.visible === false || this.alpha === 0)return;
    
    var frame = this.texture.frame;
    var context = renderSession.context;
    var texture = this.texture;

    if(this.blendMode !== renderSession.currentBlendMode)
    {
        renderSession.currentBlendMode = this.blendMode;
        context.globalCompositeOperation = PIXI.blendModesCanvas[renderSession.currentBlendMode];
    }

    if(this._mask)
    {
        renderSession.maskManager.pushMask(this._mask, renderSession.context);
    }

    

    //ignore null sources
    if(frame && frame.width && frame.height && texture.baseTexture.source)
    {
        context.globalAlpha = this.worldAlpha;

        var transform = this.worldTransform;

        // allow for trimming
        if (renderSession.roundPixels)
        {
            context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx | 0, transform.ty | 0);
        }
        else
        {
            context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);
        }

        //if smoothingEnabled is supported and we need to change the smoothing property for this texture
        if(renderSession.smoothProperty && renderSession.scaleMode !== this.texture.baseTexture.scaleMode) {
            renderSession.scaleMode = this.texture.baseTexture.scaleMode;
            context[renderSession.smoothProperty] = (renderSession.scaleMode === PIXI.scaleModes.LINEAR);
        }

        if(this.tint !== 0xFFFFFF)
        {
            
            if(this.cachedTint !== this.tint)
            {
                // no point tinting an image that has not loaded yet!
                if(!texture.baseTexture.hasLoaded)return;

                this.cachedTint = this.tint;
                
                //TODO clean up caching - how to clean up the caches?
                this.tintedTexture = PIXI.CanvasTinter.getTintedTexture(this, this.tint);
                
            }

            context.drawImage(this.tintedTexture,
                               0,
                               0,
                               frame.width,
                               frame.height,
                               (this.anchor.x) * -frame.width,
                               (this.anchor.y) * -frame.height,
                               frame.width,
                               frame.height);
        }
        else
        {

           

            if(texture.trim)
            {
                var trim =  texture.trim;

                context.drawImage(this.texture.baseTexture.source,
                               frame.x,
                               frame.y,
                               frame.width,
                               frame.height,
                               trim.x - this.anchor.x * trim.width,
                               trim.y - this.anchor.y * trim.height,
                               frame.width,
                               frame.height);
            }
            else
            {
               
                context.drawImage(this.texture.baseTexture.source,
                               frame.x,
                               frame.y,
                               frame.width,
                               frame.height,
                               (this.anchor.x) * -frame.width,
                               (this.anchor.y) * -frame.height,
                               frame.width,
                               frame.height);
            }
            
        }
    }

    // OVERWRITE
    for(var i=0,j=this.children.length; i<j; i++)
    {
        var child = this.children[i];
        child._renderCanvas(renderSession);
    }

    if(this._mask)
    {
        renderSession.maskManager.popMask(renderSession.context);
    }
};


// some helper functions..

/**
 *
 * Helper function that creates a sprite that will contain a texture from the TextureCache based on the frameId
 * The frame ids are created when a Texture packer file has been loaded
 *
 * @method fromFrame
 * @static
 * @param frameId {String} The frame Id of the texture in the cache
 * @return {Sprite} A new Sprite using a texture from the texture cache matching the frameId
 */
PIXI.Sprite.fromFrame = function(frameId)
{
    var texture = PIXI.TextureCache[frameId];
    if(!texture) throw new Error('The frameId "' + frameId + '" does not exist in the texture cache' + this);
    return new PIXI.Sprite(texture);
};

/**
 *
 * Helper function that creates a sprite that will contain a texture based on an image url
 * If the image is not in the texture cache it will be loaded
 *
 * @method fromImage
 * @static
 * @param imageId {String} The image url of the texture
 * @return {Sprite} A new Sprite using a texture from the texture cache matching the image id
 */
PIXI.Sprite.fromImage = function(imageId, crossorigin, scaleMode)
{
    var texture = PIXI.Texture.fromImage(imageId, crossorigin, scaleMode);
    return new PIXI.Sprite(texture);
};

/**
 * @author Mat Groves http://matgroves.com/
 */

/**
 * The SpriteBatch class is a really fast version of the DisplayObjectContainer 
 * built solely for speed, so use when you need a lot of sprites or particles.
 * And it's extremely easy to use : 

    var container = new PIXI.SpriteBatch();
 
    stage.addChild(container);
 
    for(var i  = 0; i < 100; i++)
    {
        var sprite = new PIXI.Sprite.fromImage("myImage.png");
        container.addChild(sprite);
    }
 * And here you have a hundred sprites that will be renderer at the speed of light
 *
 * @class SpriteBatch
 * @constructor
 * @param texture {Texture}
 */
PIXI.SpriteBatch = function(texture)
{
    PIXI.DisplayObjectContainer.call( this);

    this.textureThing = texture;

    this.ready = false;
};

PIXI.SpriteBatch.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
PIXI.SpriteBatch.constructor = PIXI.SpriteBatch;

/*
 * Initialises the spriteBatch
 *
 * @method initWebGL
 * @param gl {WebGLContext} the current WebGL drawing context
 */
PIXI.SpriteBatch.prototype.initWebGL = function(gl)
{
    // TODO only one needed for the whole engine really?
    this.fastSpriteBatch = new PIXI.WebGLFastSpriteBatch(gl);

    this.ready = true;
};

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.SpriteBatch.prototype.updateTransform = function()
{
   // TODO dont need to!
    PIXI.DisplayObject.prototype.updateTransform.call( this );
  //  PIXI.DisplayObjectContainer.prototype.updateTransform.call( this );
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.SpriteBatch.prototype._renderWebGL = function(renderSession)
{
    if(!this.visible || this.alpha <= 0 || !this.children.length)return;

    if(!this.ready)this.initWebGL( renderSession.gl );
    
    renderSession.spriteBatch.stop();
    
    renderSession.shaderManager.activateShader(renderSession.shaderManager.fastShader);
    
    this.fastSpriteBatch.begin(this, renderSession);
    this.fastSpriteBatch.render(this);

    renderSession.shaderManager.activateShader(renderSession.shaderManager.defaultShader);

    renderSession.spriteBatch.start();
 
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.SpriteBatch.prototype._renderCanvas = function(renderSession)
{
    var context = renderSession.context;
    context.globalAlpha = this.worldAlpha;

    PIXI.DisplayObject.prototype.updateTransform.call(this);

    var transform = this.worldTransform;
    // alow for trimming
       
    var isRotated = true;

    for (var i = 0; i < this.children.length; i++) {
       
        var child = this.children[i];

        if(!child.visible)continue;

        var texture = child.texture;
        var frame = texture.frame;

        context.globalAlpha = this.worldAlpha * child.alpha;

        if(child.rotation % (Math.PI * 2) === 0)
        {
            if(isRotated)
            {
                context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);
                isRotated = false;
            }

            // this is the fastest  way to optimise! - if rotation is 0 then we can avoid any kind of setTransform call
            context.drawImage(texture.baseTexture.source,
                                 frame.x,
                                 frame.y,
                                 frame.width,
                                 frame.height,
                                 ((child.anchor.x) * (-frame.width * child.scale.x) + child.position.x  + 0.5) | 0,
                                 ((child.anchor.y) * (-frame.height * child.scale.y) + child.position.y  + 0.5) | 0,
                                 frame.width * child.scale.x,
                                 frame.height * child.scale.y);
        }
        else
        {
            if(!isRotated)isRotated = true;
    
            PIXI.DisplayObject.prototype.updateTransform.call(child);
           
            var childTransform = child.worldTransform;

            // allow for trimming
           
            if (renderSession.roundPixels)
            {
                context.setTransform(childTransform.a, childTransform.c, childTransform.b, childTransform.d, childTransform.tx | 0, childTransform.ty | 0);
            }
            else
            {
                context.setTransform(childTransform.a, childTransform.c, childTransform.b, childTransform.d, childTransform.tx, childTransform.ty);
            }

            context.drawImage(texture.baseTexture.source,
                                 frame.x,
                                 frame.y,
                                 frame.width,
                                 frame.height,
                                 ((child.anchor.x) * (-frame.width) + 0.5) | 0,
                                 ((child.anchor.y) * (-frame.height) + 0.5) | 0,
                                 frame.width,
                                 frame.height);
           

        }

       // context.restore();
    }

//    context.restore();
};


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * A MovieClip is a simple way to display an animation depicted by a list of textures.
 *
 * @class MovieClip
 * @extends Sprite
 * @constructor
 * @param textures {Array<Texture>} an array of {Texture} objects that make up the animation
 */
PIXI.MovieClip = function(textures)
{
    PIXI.Sprite.call(this, textures[0]);

    /**
     * The array of textures that make up the animation
     *
     * @property textures
     * @type Array
     */
    this.textures = textures;

    /**
     * The speed that the MovieClip will play at. Higher is faster, lower is slower
     *
     * @property animationSpeed
     * @type Number
     * @default 1
     */
    this.animationSpeed = 1;

    /**
     * Whether or not the movie clip repeats after playing.
     *
     * @property loop
     * @type Boolean
     * @default true
     */
    this.loop = true;

    /**
     * Function to call when a MovieClip finishes playing
     *
     * @property onComplete
     * @type Function
     */
    this.onComplete = null;

    /**
     * [read-only] The MovieClips current frame index (this may not have to be a whole number)
     *
     * @property currentFrame
     * @type Number
     * @default 0
     * @readOnly
     */
    this.currentFrame = 0;

    /**
     * [read-only] Indicates if the MovieClip is currently playing
     *
     * @property playing
     * @type Boolean
     * @readOnly
     */
    this.playing = false;
};

// constructor
PIXI.MovieClip.prototype = Object.create( PIXI.Sprite.prototype );
PIXI.MovieClip.prototype.constructor = PIXI.MovieClip;

/**
* [read-only] totalFrames is the total number of frames in the MovieClip. This is the same as number of textures
* assigned to the MovieClip.
*
* @property totalFrames
* @type Number
* @default 0
* @readOnly
*/
Object.defineProperty( PIXI.MovieClip.prototype, 'totalFrames', {
	get: function() {

		return this.textures.length;
	}
});


/**
 * Stops the MovieClip
 *
 * @method stop
 */
PIXI.MovieClip.prototype.stop = function()
{
    this.playing = false;
};

/**
 * Plays the MovieClip
 *
 * @method play
 */
PIXI.MovieClip.prototype.play = function()
{
    this.playing = true;
};

/**
 * Stops the MovieClip and goes to a specific frame
 *
 * @method gotoAndStop
 * @param frameNumber {Number} frame index to stop at
 */
PIXI.MovieClip.prototype.gotoAndStop = function(frameNumber)
{
    this.playing = false;
    this.currentFrame = frameNumber;
    var round = (this.currentFrame + 0.5) | 0;
    this.setTexture(this.textures[round % this.textures.length]);
};

/**
 * Goes to a specific frame and begins playing the MovieClip
 *
 * @method gotoAndPlay
 * @param frameNumber {Number} frame index to start at
 */
PIXI.MovieClip.prototype.gotoAndPlay = function(frameNumber)
{
    this.currentFrame = frameNumber;
    this.playing = true;
};

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.MovieClip.prototype.updateTransform = function()
{
    PIXI.Sprite.prototype.updateTransform.call(this);

    if(!this.playing)return;

    this.currentFrame += this.animationSpeed;

    var round = (this.currentFrame + 0.5) | 0;

    if(this.loop || round < this.textures.length)
    {
        this.setTexture(this.textures[round % this.textures.length]);
    }
    else if(round >= this.textures.length)
    {
        this.gotoAndStop(this.textures.length - 1);
        if(this.onComplete)
        {
            this.onComplete();
        }
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


PIXI.FilterBlock = function()
{
    this.visible = true;
    this.renderable = true;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * - Modified by Tom Slezakowski http://www.tomslezakowski.com @TomSlezakowski (24/03/2014) - Added dropShadowColor.
 */

/**
 * A Text Object will create a line(s) of text. To split a line you can use '\n' 
 * or add a wordWrap property set to true and and wordWrapWidth property with a value
 * in the style object
 *
 * @class Text
 * @extends Sprite
 * @constructor
 * @param text {String} The copy that you would like the text to display
 * @param [style] {Object} The style parameters
 * @param [style.font] {String} default 'bold 20px Arial' The style and size of the font
 * @param [style.fill='black'] {String|Number} A canvas fillstyle that will be used on the text e.g 'red', '#00FF00'
 * @param [style.align='left'] {String} Alignment for multiline text ('left', 'center' or 'right'), does not affect single line text
 * @param [style.stroke] {String|Number} A canvas fillstyle that will be used on the text stroke e.g 'blue', '#FCFF00'
 * @param [style.strokeThickness=0] {Number} A number that represents the thickness of the stroke. Default is 0 (no stroke)
 * @param [style.wordWrap=false] {Boolean} Indicates if word wrap should be used
 * @param [style.wordWrapWidth=100] {Number} The width at which text will wrap, it needs wordWrap to be set to true
 * @param [style.dropShadow=false] {Boolean} Set a drop shadow for the text
 * @param [style.dropShadowColor='#000000'] {String} A fill style to be used on the dropshadow e.g 'red', '#00FF00'
 * @param [style.dropShadowAngle=Math.PI/4] {Number} Set a angle of the drop shadow
 * @param [style.dropShadowDistance=5] {Number} Set a distance of the drop shadow
 */
PIXI.Text = function(text, style)
{
    /**
     * The canvas element that everything is drawn to
     *
     * @property canvas
     * @type HTMLCanvasElement
     */
    this.canvas = document.createElement('canvas');

    /**
     * The canvas 2d context that everything is drawn with
     * @property context
     * @type HTMLCanvasElement 2d Context
     */
    this.context = this.canvas.getContext('2d');

    PIXI.Sprite.call(this, PIXI.Texture.fromCanvas(this.canvas));

    this.setText(text);
    this.setStyle(style);

    this.updateText();
    this.dirty = false;
};

// constructor
PIXI.Text.prototype = Object.create(PIXI.Sprite.prototype);
PIXI.Text.prototype.constructor = PIXI.Text;

/**
 * Set the style of the text
 *
 * @method setStyle
 * @param [style] {Object} The style parameters
 * @param [style.font='bold 20pt Arial'] {String} The style and size of the font
 * @param [style.fill='black'] {Object} A canvas fillstyle that will be used on the text eg 'red', '#00FF00'
 * @param [style.align='left'] {String} Alignment for multiline text ('left', 'center' or 'right'), does not affect single line text
 * @param [style.stroke='black'] {String} A canvas fillstyle that will be used on the text stroke eg 'blue', '#FCFF00'
 * @param [style.strokeThickness=0] {Number} A number that represents the thickness of the stroke. Default is 0 (no stroke)
 * @param [style.wordWrap=false] {Boolean} Indicates if word wrap should be used
 * @param [style.wordWrapWidth=100] {Number} The width at which text will wrap
 * @param [style.dropShadow=false] {Boolean} Set a drop shadow for the text
 * @param [style.dropShadowColor='#000000'] {String} A fill style to be used on the dropshadow e.g 'red', '#00FF00'
 * @param [style.dropShadowAngle=Math.PI/4] {Number} Set a angle of the drop shadow
 * @param [style.dropShadowDistance=5] {Number} Set a distance of the drop shadow
 */
PIXI.Text.prototype.setStyle = function(style)
{
    style = style || {};
    style.font = style.font || 'bold 20pt Arial';
    style.fill = style.fill || 'black';
    style.align = style.align || 'left';
    style.stroke = style.stroke || 'black'; //provide a default, see: https://github.com/GoodBoyDigital/pixi.js/issues/136
    style.strokeThickness = style.strokeThickness || 0;
    style.wordWrap = style.wordWrap || false;
    style.wordWrapWidth = style.wordWrapWidth || 100;
    style.wordWrapWidth = style.wordWrapWidth || 100;
    
    style.dropShadow = style.dropShadow || false;
    style.dropShadowAngle = style.dropShadowAngle || Math.PI / 6;
    style.dropShadowDistance = style.dropShadowDistance || 4;
    style.dropShadowColor = style.dropShadowColor || 'black';

    this.style = style;
    this.dirty = true;
};

/**
 * Set the copy for the text object. To split a line you can use '\n'
 *
 * @method setText
 * @param {String} text The copy that you would like the text to display
 */
PIXI.Text.prototype.setText = function(text)
{
    this.text = text.toString() || ' ';
    this.dirty = true;

};

/**
 * Renders text and updates it when needed
 *
 * @method updateText
 * @private
 */
PIXI.Text.prototype.updateText = function()
{
    this.context.font = this.style.font;

    var outputText = this.text;

    // word wrap
    // preserve original text
    if(this.style.wordWrap)outputText = this.wordWrap(this.text);

    //split text into lines
    var lines = outputText.split(/(?:\r\n|\r|\n)/);

    //calculate text width
    var lineWidths = [];
    var maxLineWidth = 0;
    for (var i = 0; i < lines.length; i++)
    {
        var lineWidth = this.context.measureText(lines[i]).width;
        lineWidths[i] = lineWidth;
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
    }

    var width = maxLineWidth + this.style.strokeThickness;
    if(this.style.dropShadow)width += this.style.dropShadowDistance;

    this.canvas.width = width;
    //calculate text height
    var lineHeight = this.determineFontHeight('font: ' + this.style.font  + ';') + this.style.strokeThickness;
    
    var height = lineHeight * lines.length;
    if(this.style.dropShadow)height += this.style.dropShadowDistance;

    this.canvas.height = height;

    if(navigator.isCocoonJS) this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
    
    this.context.font = this.style.font;
    this.context.strokeStyle = this.style.stroke;
    this.context.lineWidth = this.style.strokeThickness;
    this.context.textBaseline = 'top';

    var linePositionX;
    var linePositionY;

    if(this.style.dropShadow)
    {
        this.context.fillStyle = this.style.dropShadowColor;

        var xShadowOffset = Math.sin(this.style.dropShadowAngle) * this.style.dropShadowDistance;
        var yShadowOffset = Math.cos(this.style.dropShadowAngle) * this.style.dropShadowDistance;

        for (i = 0; i < lines.length; i++)
        {
            linePositionX = this.style.strokeThickness / 2;
            linePositionY = this.style.strokeThickness / 2 + i * lineHeight;

            if(this.style.align === 'right')
            {
                linePositionX += maxLineWidth - lineWidths[i];
            }
            else if(this.style.align === 'center')
            {
                linePositionX += (maxLineWidth - lineWidths[i]) / 2;
            }

            if(this.style.fill)
            {
                this.context.fillText(lines[i], linePositionX + xShadowOffset, linePositionY + yShadowOffset);
            }

          //  if(dropShadow)
        }
    }

    //set canvas text styles
    this.context.fillStyle = this.style.fill;
    
    //draw lines line by line
    for (i = 0; i < lines.length; i++)
    {
        linePositionX = this.style.strokeThickness / 2;
        linePositionY = this.style.strokeThickness / 2 + i * lineHeight;

        if(this.style.align === 'right')
        {
            linePositionX += maxLineWidth - lineWidths[i];
        }
        else if(this.style.align === 'center')
        {
            linePositionX += (maxLineWidth - lineWidths[i]) / 2;
        }

        if(this.style.stroke && this.style.strokeThickness)
        {
            this.context.strokeText(lines[i], linePositionX, linePositionY);
        }

        if(this.style.fill)
        {
            this.context.fillText(lines[i], linePositionX, linePositionY);
        }

      //  if(dropShadow)
    }


    this.updateTexture();
};

/**
 * Updates texture size based on canvas size
 *
 * @method updateTexture
 * @private
 */
PIXI.Text.prototype.updateTexture = function()
{
    this.texture.baseTexture.width = this.canvas.width;
    this.texture.baseTexture.height = this.canvas.height;
    this.texture.frame.width = this.canvas.width;
    this.texture.frame.height = this.canvas.height;

    this._width = this.canvas.width;
    this._height = this.canvas.height;

    this.requiresUpdate =  true;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.Text.prototype._renderWebGL = function(renderSession)
{
    if(this.requiresUpdate)
    {
        this.requiresUpdate = false;
        PIXI.updateWebGLTexture(this.texture.baseTexture, renderSession.gl);
    }

    PIXI.Sprite.prototype._renderWebGL.call(this, renderSession);
};

/**
 * Updates the transform of this object
 *
 * @method updateTransform
 * @private
 */
PIXI.Text.prototype.updateTransform = function()
{
    if(this.dirty)
    {
        this.updateText();
        this.dirty = false;
    }

    PIXI.Sprite.prototype.updateTransform.call(this);
};

/*
 * http://stackoverflow.com/users/34441/ellisbben
 * great solution to the problem!
 * returns the height of the given font
 *
 * @method determineFontHeight
 * @param fontStyle {Object}
 * @private
 */
PIXI.Text.prototype.determineFontHeight = function(fontStyle)
{
    // build a little reference dictionary so if the font style has been used return a
    // cached version...
    var result = PIXI.Text.heightCache[fontStyle];

    if(!result)
    {
        var body = document.getElementsByTagName('body')[0];
        var dummy = document.createElement('div');
        var dummyText = document.createTextNode('M');
        dummy.appendChild(dummyText);
        dummy.setAttribute('style', fontStyle + ';position:absolute;top:0;left:0');
        body.appendChild(dummy);

        result = dummy.offsetHeight;
        PIXI.Text.heightCache[fontStyle] = result;

        body.removeChild(dummy);
    }

    return result;
};

/**
 * Applies newlines to a string to have it optimally fit into the horizontal
 * bounds set by the Text object's wordWrapWidth property.
 *
 * @method wordWrap
 * @param text {String}
 * @private
 */
PIXI.Text.prototype.wordWrap = function(text)
{
    // Greedy wrapping algorithm that will wrap words as the line grows longer
    // than its horizontal bounds.
    var result = '';
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++)
    {
        var spaceLeft = this.style.wordWrapWidth;
        var words = lines[i].split(' ');
        for (var j = 0; j < words.length; j++)
        {
            var wordWidth = this.context.measureText(words[j]).width;
            var wordWidthWithSpace = wordWidth + this.context.measureText(' ').width;
            if(wordWidthWithSpace > spaceLeft)
            {
                // Skip printing the newline if it's the first word of the line that is
                // greater than the word wrap width.
                if(j > 0)
                {
                    result += '\n';
                }
                result += words[j] + ' ';
                spaceLeft = this.style.wordWrapWidth - wordWidth;
            }
            else
            {
                spaceLeft -= wordWidthWithSpace;
                result += words[j] + ' ';
            }
        }

        if (i < lines.length-1)
        {
            result += '\n';
        }
    }
    return result;
};

/**
 * Destroys this text object
 *
 * @method destroy
 * @param destroyTexture {Boolean}
 */
PIXI.Text.prototype.destroy = function(destroyTexture)
{
    if(destroyTexture)
    {
        this.texture.destroy();
    }

};

PIXI.Text.heightCache = {};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * A Text Object will create a line(s) of text using bitmap font. To split a line you can use '\n', '\r' or '\r\n'
 * You can generate the fnt files using
 * http://www.angelcode.com/products/bmfont/ for windows or
 * http://www.bmglyph.com/ for mac.
 *
 * @class BitmapText
 * @extends DisplayObjectContainer
 * @constructor
 * @param text {String} The copy that you would like the text to display
 * @param style {Object} The style parameters
 * @param style.font {String} The size (optional) and bitmap font id (required) eq 'Arial' or '20px Arial' (must have loaded previously)
 * @param [style.align='left'] {String} Alignment for multiline text ('left', 'center' or 'right'), does not affect single line text
 */
PIXI.BitmapText = function(text, style)
{
    PIXI.DisplayObjectContainer.call(this);

    this._pool = [];

    this.setText(text);
    this.setStyle(style);
    this.updateText();
    this.dirty = false;
};

// constructor
PIXI.BitmapText.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
PIXI.BitmapText.prototype.constructor = PIXI.BitmapText;

/**
 * Set the copy for the text object
 *
 * @method setText
 * @param text {String} The copy that you would like the text to display
 */
PIXI.BitmapText.prototype.setText = function(text)
{
    this.text = text || ' ';
    this.dirty = true;
};

/**
 * Set the style of the text
 * style.font {String} The size (optional) and bitmap font id (required) eq 'Arial' or '20px Arial' (must have loaded previously)
 * [style.align='left'] {String} Alignment for multiline text ('left', 'center' or 'right'), does not affect single line text
 *
 * @method setStyle
 * @param style {Object} The style parameters, contained as properties of an object
 */
PIXI.BitmapText.prototype.setStyle = function(style)
{
    style = style || {};
    style.align = style.align || 'left';
    this.style = style;

    var font = style.font.split(' ');
    this.fontName = font[font.length - 1];
    this.fontSize = font.length >= 2 ? parseInt(font[font.length - 2], 10) : PIXI.BitmapText.fonts[this.fontName].size;

    this.dirty = true;
    this.tint = style.tint;
};

/**
 * Renders text and updates it when needed
 *
 * @method updateText
 * @private
 */
PIXI.BitmapText.prototype.updateText = function()
{
    var data = PIXI.BitmapText.fonts[this.fontName];
    var pos = new PIXI.Point();
    var prevCharCode = null;
    var chars = [];
    var maxLineWidth = 0;
    var lineWidths = [];
    var line = 0;
    var scale = this.fontSize / data.size;
    

    for(var i = 0; i < this.text.length; i++)
    {
        var charCode = this.text.charCodeAt(i);
        if(/(?:\r\n|\r|\n)/.test(this.text.charAt(i)))
        {
            lineWidths.push(pos.x);
            maxLineWidth = Math.max(maxLineWidth, pos.x);
            line++;

            pos.x = 0;
            pos.y += data.lineHeight;
            prevCharCode = null;
            continue;
        }

        var charData = data.chars[charCode];
        if(!charData) continue;

        if(prevCharCode && charData[prevCharCode])
        {
            pos.x += charData.kerning[prevCharCode];
        }
        chars.push({texture:charData.texture, line: line, charCode: charCode, position: new PIXI.Point(pos.x + charData.xOffset, pos.y + charData.yOffset)});
        pos.x += charData.xAdvance;

        prevCharCode = charCode;
    }

    lineWidths.push(pos.x);
    maxLineWidth = Math.max(maxLineWidth, pos.x);

    var lineAlignOffsets = [];
    for(i = 0; i <= line; i++)
    {
        var alignOffset = 0;
        if(this.style.align === 'right')
        {
            alignOffset = maxLineWidth - lineWidths[i];
        }
        else if(this.style.align === 'center')
        {
            alignOffset = (maxLineWidth - lineWidths[i]) / 2;
        }
        lineAlignOffsets.push(alignOffset);
    }

    var lenChildren = this.children.length;
    var lenChars = chars.length;
    var tint = this.tint || 0xFFFFFF;
    for(i = 0; i < lenChars; i++)
    {
        var c = i < lenChildren ? this.children[i] : this._pool.pop(); // get old child if have. if not - take from pool.

        if (c) c.setTexture(chars[i].texture); // check if got one before.
        else c = new PIXI.Sprite(chars[i].texture); // if no create new one.

        c.position.x = (chars[i].position.x + lineAlignOffsets[chars[i].line]) * scale;
        c.position.y = chars[i].position.y * scale;
        c.scale.x = c.scale.y = scale;
        c.tint = tint;
        if (!c.parent) this.addChild(c);
    }

    // remove unnecessary children.
    // and put their into the pool.
    while(this.children.length > lenChars)
    {
        var child = this.getChildAt(this.children.length - 1);
        this._pool.push(child);
        this.removeChild(child);
    }


    /**
     * [read-only] The width of the overall text, different from fontSize,
     * which is defined in the style object
     *
     * @property textWidth
     * @type Number
     */
    this.textWidth = maxLineWidth * scale;

    /**
     * [read-only] The height of the overall text, different from fontSize,
     * which is defined in the style object
     *
     * @property textHeight
     * @type Number
     */
    this.textHeight = (pos.y + data.lineHeight) * scale;
};

/**
 * Updates the transform of this object
 *
 * @method updateTransform
 * @private
 */
PIXI.BitmapText.prototype.updateTransform = function()
{
    if(this.dirty)
    {
        this.updateText();
        this.dirty = false;
    }

    PIXI.DisplayObjectContainer.prototype.updateTransform.call(this);
};

PIXI.BitmapText.fonts = {};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */
 
/**
 * Holds all information related to an Interaction event
 *
 * @class InteractionData
 * @constructor
 */
PIXI.InteractionData = function()
{
    /**
     * This point stores the global coords of where the touch/mouse event happened
     *
     * @property global
     * @type Point
     */
    this.global = new PIXI.Point();

    // this is here for legacy... but will remove
    this.local = new PIXI.Point();

    /**
     * The target Sprite that was interacted with
     *
     * @property target
     * @type Sprite
     */
    this.target = null;

    /**
     * When passed to an event handler, this will be the original DOM Event that was captured
     *
     * @property originalEvent
     * @type Event
     */
    this.originalEvent = null;
};

/**
 * This will return the local coordinates of the specified displayObject for this InteractionData
 *
 * @method getLocalPosition
 * @param displayObject {DisplayObject} The DisplayObject that you would like the local coords off
 * @return {Point} A point containing the coordinates of the InteractionData position relative to the DisplayObject
 */
PIXI.InteractionData.prototype.getLocalPosition = function(displayObject)
{
    var worldTransform = displayObject.worldTransform;
    var global = this.global;

    // do a cheeky transform to get the mouse coords;
    var a00 = worldTransform.a, a01 = worldTransform.b, a02 = worldTransform.tx,
        a10 = worldTransform.c, a11 = worldTransform.d, a12 = worldTransform.ty,
        id = 1 / (a00 * a11 + a01 * -a10);
    // set the mouse coords...
    return new PIXI.Point(a11 * id * global.x + -a01 * id * global.y + (a12 * a01 - a02 * a11) * id,
                               a00 * id * global.y + -a10 * id * global.x + (-a12 * a00 + a02 * a10) * id);
};

// constructor
PIXI.InteractionData.prototype.constructor = PIXI.InteractionData;
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

 /**
 * The interaction manager deals with mouse and touch events. Any DisplayObject can be interactive
 * if its interactive parameter is set to true
 * This manager also supports multitouch.
 *
 * @class InteractionManager
 * @constructor
 * @param stage {Stage} The stage to handle interactions
 */
PIXI.InteractionManager = function(stage)
{
    /**
     * a reference to the stage
     *
     * @property stage
     * @type Stage
     */
    this.stage = stage;

    /**
     * the mouse data
     *
     * @property mouse
     * @type InteractionData
     */
    this.mouse = new PIXI.InteractionData();

    /**
     * an object that stores current touches (InteractionData) by id reference
     *
     * @property touchs
     * @type Object
     */
    this.touchs = {};

    // helpers
    this.tempPoint = new PIXI.Point();

    /**
     * 
     * @property mouseoverEnabled
     * @type Boolean
     * @default
     */
    this.mouseoverEnabled = true;

    /**
     * tiny little interactiveData pool !
     * 
     * @property pool
     * @type Array
     */
    this.pool = [];

    /**
     * An array containing all the iterative items from the our interactive tree
     * @property interactiveItems
     * @type Array
     * @private
     *
     */
    this.interactiveItems = [];

    /**
     * Our canvas
     * @property interactionDOMElement
     * @type HTMLCanvasElement
     * @private
     */
    this.interactionDOMElement = null;

    //this will make it so that you dont have to call bind all the time
    this.onMouseMove = this.onMouseMove.bind( this );
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);

    this.last = 0;

    /**
     * The css style of the cursor that is being used
     * @property currentCursorStyle
     * @type String
     *
     */
    this.currentCursorStyle = 'inherit';

    /**
     * Is set to true when the mouse is moved out of the canvas
     * @property mouseOut
     * @type Boolean
     *
     */
    this.mouseOut = false;
};

// constructor
PIXI.InteractionManager.prototype.constructor = PIXI.InteractionManager;

/**
 * Collects an interactive sprite recursively to have their interactions managed
 *
 * @method collectInteractiveSprite
 * @param displayObject {DisplayObject} the displayObject to collect
 * @param iParent {DisplayObject} the display object's parent
 * @private
 */
PIXI.InteractionManager.prototype.collectInteractiveSprite = function(displayObject, iParent)
{
    var children = displayObject.children;
    var length = children.length;

    // make an interaction tree... {item.__interactiveParent}
    for (var i = length-1; i >= 0; i--)
    {
        var child = children[i];

        // push all interactive bits
        if(child._interactive)
        {
            iParent.interactiveChildren = true;
            //child.__iParent = iParent;
            this.interactiveItems.push(child);

            if(child.children.length > 0)
            {
                this.collectInteractiveSprite(child, child);
            }
        }
        else
        {
            child.__iParent = null;

            if(child.children.length > 0)
            {
                this.collectInteractiveSprite(child, iParent);
            }
        }

    }
};

/**
 * Sets the target for event delegation
 *
 * @method setTarget
 * @param target {WebGLRenderer|CanvasRenderer} the renderer to bind events to
 * @private
 */
PIXI.InteractionManager.prototype.setTarget = function(target)
{
    this.target = target;

    //check if the dom element has been set. If it has don't do anything
    if( this.interactionDOMElement === null ) {

        this.setTargetDomElement( target.view );
    }

    
};


/**
 * Sets the DOM element which will receive mouse/touch events. This is useful for when you have other DOM
 * elements on top of the renderers Canvas element. With this you'll be able to delegate another DOM element
 * to receive those events
 *
 * @method setTargetDomElement
 * @param domElement {DOMElement} the DOM element which will receive mouse and touch events
 * @private
 */
PIXI.InteractionManager.prototype.setTargetDomElement = function(domElement)
{

    this.removeEvents();


    if (window.navigator.msPointerEnabled)
    {
        // time to remove some of that zoom in ja..
        domElement.style['-ms-content-zooming'] = 'none';
        domElement.style['-ms-touch-action'] = 'none';

        // DO some window specific touch!
    }

    this.interactionDOMElement = domElement;

    domElement.addEventListener('mousemove',  this.onMouseMove, true);
    domElement.addEventListener('mousedown',  this.onMouseDown, true);
    domElement.addEventListener('mouseout',   this.onMouseOut, true);

    // aint no multi touch just yet!
    domElement.addEventListener('touchstart', this.onTouchStart, true);
    domElement.addEventListener('touchend', this.onTouchEnd, true);
    domElement.addEventListener('touchmove', this.onTouchMove, true);

    window.addEventListener('mouseup',  this.onMouseUp, true);
};


PIXI.InteractionManager.prototype.removeEvents = function()
{
    if(!this.interactionDOMElement)return;

    this.interactionDOMElement.style['-ms-content-zooming'] = '';
    this.interactionDOMElement.style['-ms-touch-action'] = '';

    this.interactionDOMElement.removeEventListener('mousemove',  this.onMouseMove, true);
    this.interactionDOMElement.removeEventListener('mousedown',  this.onMouseDown, true);
    this.interactionDOMElement.removeEventListener('mouseout',   this.onMouseOut, true);

    // aint no multi touch just yet!
    this.interactionDOMElement.removeEventListener('touchstart', this.onTouchStart, true);
    this.interactionDOMElement.removeEventListener('touchend', this.onTouchEnd, true);
    this.interactionDOMElement.removeEventListener('touchmove', this.onTouchMove, true);

    this.interactionDOMElement = null;

    window.removeEventListener('mouseup',  this.onMouseUp, true);
};

/**
 * updates the state of interactive objects
 *
 * @method update
 * @private
 */
PIXI.InteractionManager.prototype.update = function()
{
    if(!this.target)return;

    // frequency of 30fps??
    var now = Date.now();
    var diff = now - this.last;
    diff = (diff * PIXI.INTERACTION_FREQUENCY ) / 1000;
    if(diff < 1)return;
    this.last = now;

    var i = 0;

    // ok.. so mouse events??
    // yes for now :)
    // OPTIMISE - how often to check??
    if(this.dirty)
    {
        this.dirty = false;

        var len = this.interactiveItems.length;

        for (i = 0; i < len; i++) {
            this.interactiveItems[i].interactiveChildren = false;
        }

        this.interactiveItems = [];

        if(this.stage.interactive)this.interactiveItems.push(this.stage);
        // go through and collect all the objects that are interactive..
        this.collectInteractiveSprite(this.stage, this.stage);
    }

    // loop through interactive objects!
    var length = this.interactiveItems.length;
    var cursor = 'inherit';
    var over = false;

    for (i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];

        // OPTIMISATION - only calculate every time if the mousemove function exists..
        // OK so.. does the object have any other interactive functions?
        // hit-test the clip!
       // if(item.mouseover || item.mouseout || item.buttonMode)
       // {
        // ok so there are some functions so lets hit test it..
        item.__hit = this.hitTest(item, this.mouse);
        this.mouse.target = item;
        // ok so deal with interactions..
        // looks like there was a hit!
        if(item.__hit && !over)
        {
            if(item.buttonMode) cursor = item.defaultCursor;

            if(!item.interactiveChildren)over = true;

            if(!item.__isOver)
            {
                if(item.mouseover)item.mouseover(this.mouse);
                item.__isOver = true;
            }
        }
        else
        {
            if(item.__isOver)
            {
                // roll out!
                if(item.mouseout)item.mouseout(this.mouse);
                item.__isOver = false;
            }
        }
    }

    if( this.currentCursorStyle !== cursor )
    {
        this.currentCursorStyle = cursor;
        this.interactionDOMElement.style.cursor = cursor;
    }
};

/**
 * Is called when the mouse moves across the renderer element
 *
 * @method onMouseMove
 * @param event {Event} The DOM event of the mouse moving
 * @private
 */
PIXI.InteractionManager.prototype.onMouseMove = function(event)
{
    this.mouse.originalEvent = event || window.event; //IE uses window.event
    // TODO optimize by not check EVERY TIME! maybe half as often? //
    var rect = this.interactionDOMElement.getBoundingClientRect();

    this.mouse.global.x = (event.clientX - rect.left) * (this.target.width / rect.width);
    this.mouse.global.y = (event.clientY - rect.top) * ( this.target.height / rect.height);

    var length = this.interactiveItems.length;

    for (var i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];

        if(item.mousemove)
        {
            //call the function!
            item.mousemove(this.mouse);
        }
    }
};

/**
 * Is called when the mouse button is pressed down on the renderer element
 *
 * @method onMouseDown
 * @param event {Event} The DOM event of a mouse button being pressed down
 * @private
 */
PIXI.InteractionManager.prototype.onMouseDown = function(event)
{
    this.mouse.originalEvent = event || window.event; //IE uses window.event

    if(PIXI.AUTO_PREVENT_DEFAULT)this.mouse.originalEvent.preventDefault();

    // loop through interaction tree...
    // hit test each item! ->
    // get interactive items under point??
    //stage.__i
    var length = this.interactiveItems.length;

    // while
    // hit test
    for (var i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];

        if(item.mousedown || item.click)
        {
            item.__mouseIsDown = true;
            item.__hit = this.hitTest(item, this.mouse);

            if(item.__hit)
            {
                //call the function!
                if(item.mousedown)item.mousedown(this.mouse);
                item.__isDown = true;

                // just the one!
                if(!item.interactiveChildren)break;
            }
        }
    }
};

/**
 * Is called when the mouse button is moved out of the renderer element
 *
 * @method onMouseOut
 * @param event {Event} The DOM event of a mouse button being moved out
 * @private 
 */
PIXI.InteractionManager.prototype.onMouseOut = function()
{
    var length = this.interactiveItems.length;

    this.interactionDOMElement.style.cursor = 'inherit';

    for (var i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];
        if(item.__isOver)
        {
            this.mouse.target = item;
            if(item.mouseout)item.mouseout(this.mouse);
            item.__isOver = false;
        }
    }

    this.mouseOut = true;

    // move the mouse to an impossible position
    this.mouse.global.x = -10000;
    this.mouse.global.y = -10000;
};

/**
 * Is called when the mouse button is released on the renderer element
 *
 * @method onMouseUp
 * @param event {Event} The DOM event of a mouse button being released
 * @private
 */
PIXI.InteractionManager.prototype.onMouseUp = function(event)
{

    this.mouse.originalEvent = event || window.event; //IE uses window.event

    var length = this.interactiveItems.length;
    var up = false;

    for (var i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];

        item.__hit = this.hitTest(item, this.mouse);

        if(item.__hit && !up)
        {
            //call the function!
            if(item.mouseup)
            {
                item.mouseup(this.mouse);
            }
            if(item.__isDown)
            {
                if(item.click)item.click(this.mouse);
            }

            if(!item.interactiveChildren)up = true;
        }
        else
        {
            if(item.__isDown)
            {
                if(item.mouseupoutside)item.mouseupoutside(this.mouse);
            }
        }

        item.__isDown = false;
        //}
    }
};

/**
 * Tests if the current mouse coordinates hit a sprite
 *
 * @method hitTest
 * @param item {DisplayObject} The displayObject to test for a hit
 * @param interactionData {InteractionData} The interactionData object to update in the case there is a hit
 * @private
 */
PIXI.InteractionManager.prototype.hitTest = function(item, interactionData)
{
    var global = interactionData.global;

    if( !item.worldVisible )return false;

    // temp fix for if the element is in a non visible
   
    var isSprite = (item instanceof PIXI.Sprite),
        worldTransform = item.worldTransform,
        a00 = worldTransform.a, a01 = worldTransform.b, a02 = worldTransform.tx,
        a10 = worldTransform.c, a11 = worldTransform.d, a12 = worldTransform.ty,
        id = 1 / (a00 * a11 + a01 * -a10),
        x = a11 * id * global.x + -a01 * id * global.y + (a12 * a01 - a02 * a11) * id,
        y = a00 * id * global.y + -a10 * id * global.x + (-a12 * a00 + a02 * a10) * id;

    interactionData.target = item;

    //a sprite or display object with a hit area defined
    if(item.hitArea && item.hitArea.contains) {
        if(item.hitArea.contains(x, y)) {
            //if(isSprite)
            interactionData.target = item;

            return true;
        }

        return false;
    }
    // a sprite with no hitarea defined
    else if(isSprite)
    {
        var width = item.texture.frame.width,
            height = item.texture.frame.height,
            x1 = -width * item.anchor.x,
            y1;

        if(x > x1 && x < x1 + width)
        {
            y1 = -height * item.anchor.y;

            if(y > y1 && y < y1 + height)
            {
                // set the target property if a hit is true!
                interactionData.target = item;
                return true;
            }
        }
    }

    var length = item.children.length;

    for (var i = 0; i < length; i++)
    {
        var tempItem = item.children[i];
        var hit = this.hitTest(tempItem, interactionData);
        if(hit)
        {
            // hmm.. TODO SET CORRECT TARGET?
            interactionData.target = item;
            return true;
        }
    }

    return false;
};

/**
 * Is called when a touch is moved across the renderer element
 *
 * @method onTouchMove
 * @param event {Event} The DOM event of a touch moving across the renderer view
 * @private
 */
PIXI.InteractionManager.prototype.onTouchMove = function(event)
{
    var rect = this.interactionDOMElement.getBoundingClientRect();
    var changedTouches = event.changedTouches;
    var touchData;
    var i = 0;

    for (i = 0; i < changedTouches.length; i++)
    {
        var touchEvent = changedTouches[i];
        touchData = this.touchs[touchEvent.identifier];
        touchData.originalEvent =  event || window.event;

        // update the touch position
        touchData.global.x = (touchEvent.clientX - rect.left) * (this.target.width / rect.width);
        touchData.global.y = (touchEvent.clientY - rect.top)  * (this.target.height / rect.height);
        if(navigator.isCocoonJS) {
            touchData.global.x = touchEvent.clientX;
            touchData.global.y = touchEvent.clientY;
        }
    }

    var length = this.interactiveItems.length;
    for (i = 0; i < length; i++)
    {
        var item = this.interactiveItems[i];
        if(item.touchmove)
            item.touchmove(touchData);
    }
};

/**
 * Is called when a touch is started on the renderer element
 *
 * @method onTouchStart
 * @param event {Event} The DOM event of a touch starting on the renderer view
 * @private
 */
PIXI.InteractionManager.prototype.onTouchStart = function(event)
{
    var rect = this.interactionDOMElement.getBoundingClientRect();

    if(PIXI.AUTO_PREVENT_DEFAULT)event.preventDefault();
    
    var changedTouches = event.changedTouches;
    for (var i=0; i < changedTouches.length; i++)
    {
        var touchEvent = changedTouches[i];

        var touchData = this.pool.pop();
        if(!touchData)touchData = new PIXI.InteractionData();

        touchData.originalEvent =  event || window.event;

        this.touchs[touchEvent.identifier] = touchData;
        touchData.global.x = (touchEvent.clientX - rect.left) * (this.target.width / rect.width);
        touchData.global.y = (touchEvent.clientY - rect.top)  * (this.target.height / rect.height);
        if(navigator.isCocoonJS) {
            touchData.global.x = touchEvent.clientX;
            touchData.global.y = touchEvent.clientY;
        }

        var length = this.interactiveItems.length;

        for (var j = 0; j < length; j++)
        {
            var item = this.interactiveItems[j];

            if(item.touchstart || item.tap)
            {
                item.__hit = this.hitTest(item, touchData);

                if(item.__hit)
                {
                    //call the function!
                    if(item.touchstart)item.touchstart(touchData);
                    item.__isDown = true;
                    item.__touchData = touchData;

                    if(!item.interactiveChildren)break;
                }
            }
        }
    }
};

/**
 * Is called when a touch is ended on the renderer element
 *
 * @method onTouchEnd
 * @param event {Event} The DOM event of a touch ending on the renderer view
 * @private
 */
PIXI.InteractionManager.prototype.onTouchEnd = function(event)
{
    //this.mouse.originalEvent = event || window.event; //IE uses window.event
    var rect = this.interactionDOMElement.getBoundingClientRect();
    var changedTouches = event.changedTouches;

    for (var i=0; i < changedTouches.length; i++)
    {
        var touchEvent = changedTouches[i];
        var touchData = this.touchs[touchEvent.identifier];
        var up = false;
        touchData.global.x = (touchEvent.clientX - rect.left) * (this.target.width / rect.width);
        touchData.global.y = (touchEvent.clientY - rect.top)  * (this.target.height / rect.height);
        if(navigator.isCocoonJS) {
            touchData.global.x = touchEvent.clientX;
            touchData.global.y = touchEvent.clientY;
        }

        var length = this.interactiveItems.length;
        for (var j = 0; j < length; j++)
        {
            var item = this.interactiveItems[j];
            var itemTouchData = item.__touchData; // <-- Here!
            item.__hit = this.hitTest(item, touchData);

            if(itemTouchData === touchData)
            {
                // so this one WAS down...
                touchData.originalEvent = event || window.event;
                // hitTest??

                if(item.touchend || item.tap)
                {
                    if(item.__hit && !up)
                    {
                        if(item.touchend)item.touchend(touchData);
                        if(item.__isDown)
                        {
                            if(item.tap)item.tap(touchData);
                        }

                        if(!item.interactiveChildren)up = true;
                    }
                    else
                    {
                        if(item.__isDown)
                        {
                            if(item.touchendoutside)item.touchendoutside(touchData);
                        }
                    }

                    item.__isDown = false;
                }

                item.__touchData = null;

            }
            /*
            else
            {

            }
            */
        }
        // remove the touch..
        this.pool.push(touchData);
        this.touchs[touchEvent.identifier] = null;
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * A Stage represents the root of the display tree. Everything connected to the stage is rendered
 *
 * @class Stage
 * @extends DisplayObjectContainer
 * @constructor
 * @param backgroundColor {Number} the background color of the stage, you have to pass this in is in hex format
 *      like: 0xFFFFFF for white
 * 
 * Creating a stage is a mandatory process when you use Pixi, which is as simple as this : 
 * var stage = new PIXI.Stage(0xFFFFFF);
 * where the parameter given is the background colour of the stage, in hex
 * you will use this stage instance to add your sprites to it and therefore to the renderer
 * Here is how to add a sprite to the stage : 
 * stage.addChild(sprite);
 */
PIXI.Stage = function(backgroundColor)
{
    PIXI.DisplayObjectContainer.call( this );

    /**
     * [read-only] Current transform of the object based on world (parent) factors
     *
     * @property worldTransform
     * @type Mat3
     * @readOnly
     * @private
     */
    this.worldTransform = new PIXI.Matrix();

    /**
     * Whether or not the stage is interactive
     *
     * @property interactive
     * @type Boolean
     */
    this.interactive = true;

    /**
     * The interaction manage for this stage, manages all interactive activity on the stage
     *
     * @property interactive
     * @type InteractionManager
     */
    this.interactionManager = new PIXI.InteractionManager(this);

    /**
     * Whether the stage is dirty and needs to have interactions updated
     *
     * @property dirty
     * @type Boolean
     * @private
     */
    this.dirty = true;

    //the stage is its own stage
    this.stage = this;

    //optimize hit detection a bit
    this.stage.hitArea = new PIXI.Rectangle(0,0,100000, 100000);

    this.setBackgroundColor(backgroundColor);
};

// constructor
PIXI.Stage.prototype = Object.create( PIXI.DisplayObjectContainer.prototype );
PIXI.Stage.prototype.constructor = PIXI.Stage;

/**
 * Sets another DOM element which can receive mouse/touch interactions instead of the default Canvas element.
 * This is useful for when you have other DOM elements on top of the Canvas element.
 *
 * @method setInteractionDelegate
 * @param domElement {DOMElement} This new domElement which will receive mouse/touch events
 */
PIXI.Stage.prototype.setInteractionDelegate = function(domElement)
{
    this.interactionManager.setTargetDomElement( domElement );
};

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.Stage.prototype.updateTransform = function()
{
    this.worldAlpha = 1;

    for(var i=0,j=this.children.length; i<j; i++)
    {
        this.children[i].updateTransform();
    }

    if(this.dirty)
    {
        this.dirty = false;
        // update interactive!
        this.interactionManager.dirty = true;
    }

    if(this.interactive)this.interactionManager.update();
};

/**
 * Sets the background color for the stage
 *
 * @method setBackgroundColor
 * @param backgroundColor {Number} the color of the background, easiest way to pass this in is in hex format
 *      like: 0xFFFFFF for white
 */
PIXI.Stage.prototype.setBackgroundColor = function(backgroundColor)
{
    this.backgroundColor = backgroundColor || 0x000000;
    this.backgroundColorSplit = PIXI.hex2rgb(this.backgroundColor);
    var hex = this.backgroundColor.toString(16);
    hex = '000000'.substr(0, 6 - hex.length) + hex;
    this.backgroundColorString = '#' + hex;
};

/**
 * This will return the point containing global coords of the mouse.
 *
 * @method getMousePosition
 * @return {Point} The point containing the coords of the global InteractionData position.
 */
PIXI.Stage.prototype.getMousePosition = function()
{
    return this.interactionManager.mouse.global;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */
 
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel

// MIT license

/**
 * A polyfill for requestAnimationFrame
 * You can actually use both requestAnimationFrame and requestAnimFrame, 
 * you will still benefit from the polyfill
 *
 * @method requestAnimationFrame
 */
/**
 * A polyfill for cancelAnimationFrame
 *
 * @method cancelAnimationFrame
 */
var lastTime = 0;
var vendors = ['ms', 'moz', 'webkit', 'o'];
for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
        window[vendors[x] + 'CancelRequestAnimationFrame'];
}

if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); },
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };
}

if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };
}

window.requestAnimFrame = window.requestAnimationFrame;

/**
 * Converts a hex color number to an [R, G, B] array
 *
 * @method hex2rgb
 * @param hex {Number}
 */
PIXI.hex2rgb = function(hex) {
    return [(hex >> 16 & 0xFF) / 255, ( hex >> 8 & 0xFF) / 255, (hex & 0xFF)/ 255];
};

/**
 * Converts a color as an [R, G, B] array to a hex number
 *
 * @method rgb2hex
 * @param rgb {Array}
 */
PIXI.rgb2hex = function(rgb) {
    return ((rgb[0]*255 << 16) + (rgb[1]*255 << 8) + rgb[2]*255);
};

/**
 * A polyfill for Function.prototype.bind
 *
 * @method bind
 */
if (typeof Function.prototype.bind !== 'function') {
    Function.prototype.bind = (function () {
        var slice = Array.prototype.slice;
        return function (thisArg) {
            var target = this, boundArgs = slice.call(arguments, 1);

            if (typeof target !== 'function') throw new TypeError();

            function bound() {
                var args = boundArgs.concat(slice.call(arguments));
                target.apply(this instanceof bound ? this : thisArg, args);
            }

            bound.prototype = (function F(proto) {
                if (proto) F.prototype = proto;
                if (!(this instanceof F)) return new F();
            })(target.prototype);

            return bound;
        };
    })();
}

/**
 * A wrapper for ajax requests to be handled cross browser
 *
 * @class AjaxRequest
 * @constructor
 */
PIXI.AjaxRequest = function()
{
    var activexmodes = ['Msxml2.XMLHTTP.6.0', 'Msxml2.XMLHTTP.3.0', 'Microsoft.XMLHTTP']; //activeX versions to check for in IE

    if (window.ActiveXObject)
    { //Test for support for ActiveXObject in IE first (as XMLHttpRequest in IE7 is broken)
        for (var i=0; i<activexmodes.length; i++)
        {
            try{
                return new window.ActiveXObject(activexmodes[i]);
            }
            catch(e) {
                //suppress error
            }
        }
    }
    else if (window.XMLHttpRequest) // if Mozilla, Safari etc
    {
        return new window.XMLHttpRequest();
    }
    else
    {
        return false;
    }
};
/*
PIXI.packColorRGBA = function(r, g, b, a)//r, g, b, a)
{
  //  console.log(r, b, c, d)
  return (Math.floor((r)*63) << 18) | (Math.floor((g)*63) << 12) | (Math.floor((b)*63) << 6);// | (Math.floor((a)*63))
  //  i = i | (Math.floor((a)*63));
   // return i;
   // var r = (i / 262144.0 ) / 64;
   // var g = (i / 4096.0)%64 / 64;
  //  var b = (i / 64.0)%64 / 64;
  //  var a = (i)%64 / 64;
     
  //  console.log(r, g, b, a);
  //  return i;

};
*/
/*
PIXI.packColorRGB = function(r, g, b)//r, g, b, a)
{
    return (Math.floor((r)*255) << 16) | (Math.floor((g)*255) << 8) | (Math.floor((b)*255));
};

PIXI.unpackColorRGB = function(r, g, b)//r, g, b, a)
{
    return (Math.floor((r)*255) << 16) | (Math.floor((g)*255) << 8) | (Math.floor((b)*255));
};
*/

/**
 * Checks whether the Canvas BlendModes are supported by the current browser
 *
 * @method canUseNewCanvasBlendModes
 * @return {Boolean} whether they are supported
 */
PIXI.canUseNewCanvasBlendModes = function()
{
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    var context = canvas.getContext('2d');
    context.fillStyle = '#000';
    context.fillRect(0,0,1,1);
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = '#fff';
    context.fillRect(0,0,1,1);
    return context.getImageData(0,0,1,1).data[0] === 0;
};

/**
 * Given a number, this function returns the closest number that is a power of two
 * this function is taken from Starling Framework as its pretty neat ;)
 *
 * @method getNextPowerOfTwo
 * @param number {Number}
 * @return {Number} the closest number that is a power of two
 */
PIXI.getNextPowerOfTwo = function(number)
{
    if (number > 0 && (number & (number - 1)) === 0) // see: http://goo.gl/D9kPj
        return number;
    else
    {
        var result = 1;
        while (result < number) result <<= 1;
        return result;
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */
 
/**
 * https://github.com/mrdoob/eventtarget.js/
 * THankS mr DOob!
 */

/**
 * Adds event emitter functionality to a class
 *
 * @class EventTarget
 * @example
 *      function MyEmitter() {
 *          PIXI.EventTarget.call(this); //mixes in event target stuff
 *      }
 *
 *      var em = new MyEmitter();
 *      em.emit({ type: 'eventName', data: 'some data' });
 */
PIXI.EventTarget = function () {

    /**
     * Holds all the listeners
     *
     * @property listeners
     * @type Object
     */
    var listeners = {};

    /**
     * Adds a listener for a specific event
     *
     * @method addEventListener
     * @param type {string} A string representing the event type to listen for.
     * @param listener {function} The callback function that will be fired when the event occurs
     */
    this.addEventListener = this.on = function ( type, listener ) {


        if ( listeners[ type ] === undefined ) {

            listeners[ type ] = [];

        }

        if ( listeners[ type ].indexOf( listener ) === - 1 ) {

            listeners[ type ].push( listener );
        }

    };

    /**
     * Fires the event, ie pretends that the event has happened
     *
     * @method dispatchEvent
     * @param event {Event} the event object
     */
    this.dispatchEvent = this.emit = function ( event ) {

        if ( !listeners[ event.type ] || !listeners[ event.type ].length ) {

            return;

        }

        for(var i = 0, l = listeners[ event.type ].length; i < l; i++) {

            listeners[ event.type ][ i ]( event );

        }

    };

    /**
     * Removes the specified listener that was assigned to the specified event type
     *
     * @method removeEventListener
     * @param type {string} A string representing the event type which will have its listener removed
     * @param listener {function} The callback function that was be fired when the event occured
     */
    this.removeEventListener = this.off = function ( type, listener ) {

        var index = listeners[ type ].indexOf( listener );

        if ( index !== - 1 ) {

            listeners[ type ].splice( index, 1 );

        }

    };

    /**
     * Removes all the listeners that were active for the specified event type
     *
     * @method removeAllEventListeners
     * @param type {string} A string representing the event type which will have all its listeners removed
     */
	this.removeAllEventListeners = function( type ) {
		var a = listeners[type];
		if (a)
			a.length = 0;
	};
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * This helper function will automatically detect which renderer you should be using.
 * WebGL is the preferred renderer as it is a lot faster. If webGL is not supported by
 * the browser then this function will return a canvas renderer
 * @class autoDetectRenderer
 * @static
 * @param width=800 {Number} the width of the renderers view
 * @param height=600 {Number} the height of the renderers view
 * @param [view] {Canvas} the canvas to use as a view, optional 
 * @param [transparent=false] {Boolean} the transparency of the render view, default false
 * @param [antialias=false] {Boolean} sets antialias (only applicable in webGL chrome at the moment)
 *
 */
PIXI.autoDetectRenderer = function(width, height, view, transparent, antialias)
{
    if(!width)width = 800;
    if(!height)height = 600;

    // BORROWED from Mr Doob (mrdoob.com)
    var webgl = ( function () { try {
                                    var canvas = document.createElement( 'canvas' );
                                    return !! window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) );
                                } catch( e ) {
                                    return false;
                                }
                            } )();


    if( webgl )
    {
        return new PIXI.WebGLRenderer(width, height, view, transparent, antialias);
    }

    return  new PIXI.CanvasRenderer(width, height, view, transparent);
};

/*
    PolyK library
    url: http://polyk.ivank.net
    Released under MIT licence.

    Copyright (c) 2012 Ivan Kuckir

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.

    This is an amazing lib!

    slightly modified by Mat Groves (matgroves.com);
*/

/**
 * Based on the Polyk library http://polyk.ivank.net released under MIT licence.
 * This is an amazing lib!
 * slightly modified by Mat Groves (matgroves.com);
 * @class PolyK
 *
 */
PIXI.PolyK = {};

/**
 * Triangulates shapes for webGL graphic fills
 *
 * @method Triangulate
 * 
 */
PIXI.PolyK.Triangulate = function(p)
{
    var sign = true;

    var n = p.length >> 1;
    if(n < 3) return [];

    var tgs = [];
    var avl = [];
    for(var i = 0; i < n; i++) avl.push(i);

    i = 0;
    var al = n;
    while(al > 3)
    {
        var i0 = avl[(i+0)%al];
        var i1 = avl[(i+1)%al];
        var i2 = avl[(i+2)%al];

        var ax = p[2*i0],  ay = p[2*i0+1];
        var bx = p[2*i1],  by = p[2*i1+1];
        var cx = p[2*i2],  cy = p[2*i2+1];

        var earFound = false;
        if(PIXI.PolyK._convex(ax, ay, bx, by, cx, cy, sign))
        {
            earFound = true;
            for(var j = 0; j < al; j++)
            {
                var vi = avl[j];
                if(vi === i0 || vi === i1 || vi === i2) continue;

                if(PIXI.PolyK._PointInTriangle(p[2*vi], p[2*vi+1], ax, ay, bx, by, cx, cy)) {
                    earFound = false;
                    break;
                }
            }
        }

        if(earFound)
        {
            tgs.push(i0, i1, i2);
            avl.splice((i+1)%al, 1);
            al--;
            i = 0;
        }
        else if(i++ > 3*al)
        {
            // need to flip flip reverse it!
            // reset!
            if(sign)
            {
                tgs = [];
                avl = [];
                for(i = 0; i < n; i++) avl.push(i);

                i = 0;
                al = n;

                sign = false;
            }
            else
            {
                window.console.log("PIXI Warning: shape too complex to fill");
                return [];
            }
        }
    }

    tgs.push(avl[0], avl[1], avl[2]);
    return tgs;
};

/**
 * Checks whether a point is within a triangle
 *
 * @method _PointInTriangle
 * @param px {Number} x coordinate of the point to test
 * @param py {Number} y coordinate of the point to test
 * @param ax {Number} x coordinate of the a point of the triangle
 * @param ay {Number} y coordinate of the a point of the triangle
 * @param bx {Number} x coordinate of the b point of the triangle
 * @param by {Number} y coordinate of the b point of the triangle
 * @param cx {Number} x coordinate of the c point of the triangle
 * @param cy {Number} y coordinate of the c point of the triangle
 * @private
 */
PIXI.PolyK._PointInTriangle = function(px, py, ax, ay, bx, by, cx, cy)
{
    var v0x = cx-ax;
    var v0y = cy-ay;
    var v1x = bx-ax;
    var v1y = by-ay;
    var v2x = px-ax;
    var v2y = py-ay;

    var dot00 = v0x*v0x+v0y*v0y;
    var dot01 = v0x*v1x+v0y*v1y;
    var dot02 = v0x*v2x+v0y*v2y;
    var dot11 = v1x*v1x+v1y*v1y;
    var dot12 = v1x*v2x+v1y*v2y;

    var invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    var v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    // Check if point is in triangle
    return (u >= 0) && (v >= 0) && (u + v < 1);
};

/**
 * Checks whether a shape is convex
 *
 * @method _convex
 * 
 * @private
 */
PIXI.PolyK._convex = function(ax, ay, bx, by, cx, cy, sign)
{
    return ((ay-by)*(cx-bx) + (bx-ax)*(cy-by) >= 0) === sign;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

// TODO Alvin and Mat
// Should we eventually create a Utils class ? 
// Or just move this file to the pixi.js file ?
PIXI.initDefaultShaders = function()
{
   
  //  PIXI.stripShader = new PIXI.StripShader();
//    PIXI.stripShader.init();

};

PIXI.CompileVertexShader = function(gl, shaderSrc)
{
    return PIXI._CompileShader(gl, shaderSrc, gl.VERTEX_SHADER);
};

PIXI.CompileFragmentShader = function(gl, shaderSrc)
{
    return PIXI._CompileShader(gl, shaderSrc, gl.FRAGMENT_SHADER);
};

PIXI._CompileShader = function(gl, shaderSrc, shaderType)
{
    var src = shaderSrc.join("\n");
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        window.console.log(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

PIXI.compileProgram = function(gl, vertexSrc, fragmentSrc)
{
    var fragmentShader = PIXI.CompileFragmentShader(gl, fragmentSrc);
    var vertexShader = PIXI.CompileVertexShader(gl, vertexSrc);

    var shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        window.console.log("Could not initialise shaders");
    }

    return shaderProgram;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * @author Richard Davey http://www.photonstorm.com @photonstorm
 */

/**
* @class PixiShader
* @constructor
*/
PIXI.PixiShader = function(gl)
{
    /**
     * @property gl
     * @type WebGLContext
     */
    this.gl = gl;

    /**
    * @property {any} program - The WebGL program.
    */
    this.program = null;

    /**
    * @property {array} fragmentSrc - The fragment shader.
    */
    this.fragmentSrc = [
        'precision lowp float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D uSampler;',
        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor ;',
        '}'
    ];

    /**
    * @property {number} textureCount - A local texture counter for multi-texture shaders.
    */
    this.textureCount = 0;

    this.attributes = [];

    this.init();
};

/**
* Initialises the shader
* @method init
*
*/
PIXI.PixiShader.prototype.init = function()
{
    var gl = this.gl;

    var program = PIXI.compileProgram(gl, this.vertexSrc || PIXI.PixiShader.defaultVertexSrc, this.fragmentSrc);
    
    gl.useProgram(program);

    // get and store the uniforms for the shader
    this.uSampler = gl.getUniformLocation(program, 'uSampler');
    this.projectionVector = gl.getUniformLocation(program, 'projectionVector');
    this.offsetVector = gl.getUniformLocation(program, 'offsetVector');
    this.dimensions = gl.getUniformLocation(program, 'dimensions');

    // get and store the attributes
    this.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
    this.aTextureCoord = gl.getAttribLocation(program, 'aTextureCoord');
    this.colorAttribute = gl.getAttribLocation(program, 'aColor');


    // Begin worst hack eva //

    // WHY??? ONLY on my chrome pixel the line above returns -1 when using filters?
    // maybe its something to do with the current state of the gl context.
    // Im convinced this is a bug in the chrome browser as there is NO reason why this should be returning -1 especially as it only manifests on my chrome pixel
    // If theres any webGL people that know why could happen please help :)
    if(this.colorAttribute === -1)
    {
        this.colorAttribute = 2;
    }

    this.attributes = [this.aVertexPosition, this.aTextureCoord, this.colorAttribute];

    // End worst hack eva //

    // add those custom shaders!
    for (var key in this.uniforms)
    {
        // get the uniform locations..
        this.uniforms[key].uniformLocation = gl.getUniformLocation(program, key);
    }

    this.initUniforms();

    this.program = program;
};

/**
* Initialises the shader uniform values.
* Uniforms are specified in the GLSL_ES Specification: http://www.khronos.org/registry/webgl/specs/latest/1.0/
* http://www.khronos.org/registry/gles/specs/2.0/GLSL_ES_Specification_1.0.17.pdf
*
* @method initUniforms
*/
PIXI.PixiShader.prototype.initUniforms = function()
{
    this.textureCount = 1;
    var gl = this.gl;
    var uniform;

    for (var key in this.uniforms)
    {
        uniform = this.uniforms[key];

        var type = uniform.type;

        if (type === 'sampler2D')
        {
            uniform._init = false;

            if (uniform.value !== null)
            {
                this.initSampler2D(uniform);
            }
        }
        else if (type === 'mat2' || type === 'mat3' || type === 'mat4')
        {
            //  These require special handling
            uniform.glMatrix = true;
            uniform.glValueLength = 1;

            if (type === 'mat2')
            {
                uniform.glFunc = gl.uniformMatrix2fv;
            }
            else if (type === 'mat3')
            {
                uniform.glFunc = gl.uniformMatrix3fv;
            }
            else if (type === 'mat4')
            {
                uniform.glFunc = gl.uniformMatrix4fv;
            }
        }
        else
        {
            //  GL function reference
            uniform.glFunc = gl['uniform' + type];

            if (type === '2f' || type === '2i')
            {
                uniform.glValueLength = 2;
            }
            else if (type === '3f' || type === '3i')
            {
                uniform.glValueLength = 3;
            }
            else if (type === '4f' || type === '4i')
            {
                uniform.glValueLength = 4;
            }
            else
            {
                uniform.glValueLength = 1;
            }
        }
    }

};

/**
* Initialises a Sampler2D uniform (which may only be available later on after initUniforms once the texture has loaded)
*
* @method initSampler2D
*/
PIXI.PixiShader.prototype.initSampler2D = function(uniform)
{
    if (!uniform.value || !uniform.value.baseTexture || !uniform.value.baseTexture.hasLoaded)
    {
        return;
    }

    var gl = this.gl;

    gl.activeTexture(gl['TEXTURE' + this.textureCount]);
    gl.bindTexture(gl.TEXTURE_2D, uniform.value.baseTexture._glTextures[gl.id]);

    //  Extended texture data
    if (uniform.textureData)
    {
        var data = uniform.textureData;

        // GLTexture = mag linear, min linear_mipmap_linear, wrap repeat + gl.generateMipmap(gl.TEXTURE_2D);
        // GLTextureLinear = mag/min linear, wrap clamp
        // GLTextureNearestRepeat = mag/min NEAREST, wrap repeat
        // GLTextureNearest = mag/min nearest, wrap clamp
        // AudioTexture = whatever + luminance + width 512, height 2, border 0
        // KeyTexture = whatever + luminance + width 256, height 2, border 0

        //  magFilter can be: gl.LINEAR, gl.LINEAR_MIPMAP_LINEAR or gl.NEAREST
        //  wrapS/T can be: gl.CLAMP_TO_EDGE or gl.REPEAT

        var magFilter = (data.magFilter) ? data.magFilter : gl.LINEAR;
        var minFilter = (data.minFilter) ? data.minFilter : gl.LINEAR;
        var wrapS = (data.wrapS) ? data.wrapS : gl.CLAMP_TO_EDGE;
        var wrapT = (data.wrapT) ? data.wrapT : gl.CLAMP_TO_EDGE;
        var format = (data.luminance) ? gl.LUMINANCE : gl.RGBA;

        if (data.repeat)
        {
            wrapS = gl.REPEAT;
            wrapT = gl.REPEAT;
        }

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !!data.flipY);

        if (data.width)
        {
            var width = (data.width) ? data.width : 512;
            var height = (data.height) ? data.height : 2;
            var border = (data.border) ? data.border : 0;

            // void texImage2D(GLenum target, GLint level, GLenum internalformat, GLsizei width, GLsizei height, GLint border, GLenum format, GLenum type, ArrayBufferView? pixels);
            gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, border, format, gl.UNSIGNED_BYTE, null);
        }
        else
        {
            //  void texImage2D(GLenum target, GLint level, GLenum internalformat, GLenum format, GLenum type, ImageData? pixels);
            gl.texImage2D(gl.TEXTURE_2D, 0, format, gl.RGBA, gl.UNSIGNED_BYTE, uniform.value.baseTexture.source);
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    }

    gl.uniform1i(uniform.uniformLocation, this.textureCount);

    uniform._init = true;

    this.textureCount++;

};

/**
* Updates the shader uniform values.
*
* @method syncUniforms
*/
PIXI.PixiShader.prototype.syncUniforms = function()
{
    this.textureCount = 1;
    var uniform;
    var gl = this.gl;

    //  This would probably be faster in an array and it would guarantee key order
    for (var key in this.uniforms)
    {
        uniform = this.uniforms[key];

        if (uniform.glValueLength === 1)
        {
            if (uniform.glMatrix === true)
            {
                uniform.glFunc.call(gl, uniform.uniformLocation, uniform.transpose, uniform.value);
            }
            else
            {
                uniform.glFunc.call(gl, uniform.uniformLocation, uniform.value);
            }
        }
        else if (uniform.glValueLength === 2)
        {
            uniform.glFunc.call(gl, uniform.uniformLocation, uniform.value.x, uniform.value.y);
        }
        else if (uniform.glValueLength === 3)
        {
            uniform.glFunc.call(gl, uniform.uniformLocation, uniform.value.x, uniform.value.y, uniform.value.z);
        }
        else if (uniform.glValueLength === 4)
        {
            uniform.glFunc.call(gl, uniform.uniformLocation, uniform.value.x, uniform.value.y, uniform.value.z, uniform.value.w);
        }
        else if (uniform.type === 'sampler2D')
        {
            if (uniform._init)
            {
                gl.activeTexture(gl['TEXTURE' + this.textureCount]);
                gl.bindTexture(gl.TEXTURE_2D, uniform.value.baseTexture._glTextures[gl.id] || PIXI.createWebGLTexture( uniform.value.baseTexture, gl));
                gl.uniform1i(uniform.uniformLocation, this.textureCount);
                this.textureCount++;
            }
            else
            {
                this.initSampler2D(uniform);
            }
        }
    }

};

/**
* Destroys the shader
* @method destroy
*/
PIXI.PixiShader.prototype.destroy = function()
{
    this.gl.deleteProgram( this.program );
    this.uniforms = null;
    this.gl = null;

    this.attributes = null;
};

/**
* The Default Vertex shader source
* @property defaultVertexSrc
* @type String
*/
PIXI.PixiShader.defaultVertexSrc = [
    'attribute vec2 aVertexPosition;',
    'attribute vec2 aTextureCoord;',
    'attribute vec2 aColor;',

    'uniform vec2 projectionVector;',
    'uniform vec2 offsetVector;',

    'varying vec2 vTextureCoord;',
    'varying vec4 vColor;',

    'const vec2 center = vec2(-1.0, 1.0);',

    'void main(void) {',
    '   gl_Position = vec4( ((aVertexPosition + offsetVector) / projectionVector) + center , 0.0, 1.0);',
    '   vTextureCoord = aTextureCoord;',
    '   vec3 color = mod(vec3(aColor.y/65536.0, aColor.y/256.0, aColor.y), 256.0) / 256.0;',
    '   vColor = vec4(color * aColor.x, aColor.x);',
    '}'
];

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * @author Richard Davey http://www.photonstorm.com @photonstorm
 */

/**
* @class PixiFastShader
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.PixiFastShader = function(gl)
{

    /**
     * @property gl
     * @type WebGLContext
     */
    this.gl = gl;

    /**
     * @property {any} program - The WebGL program.
     */
    this.program = null;

    /**
     * @property {array} fragmentSrc - The fragment shader.
     */
    this.fragmentSrc = [
        'precision lowp float;',
        'varying vec2 vTextureCoord;',
        'varying float vColor;',
        'uniform sampler2D uSampler;',
        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord) * vColor ;',
        '}'
    ];

    /**
    * @property {array} vertexSrc - The vertex shader
    */
    this.vertexSrc = [
        'attribute vec2 aVertexPosition;',
        'attribute vec2 aPositionCoord;',
        'attribute vec2 aScale;',
        'attribute float aRotation;',
        'attribute vec2 aTextureCoord;',
        'attribute float aColor;',

        'uniform vec2 projectionVector;',
        'uniform vec2 offsetVector;',
        'uniform mat3 uMatrix;',

        'varying vec2 vTextureCoord;',
        'varying float vColor;',

        'const vec2 center = vec2(-1.0, 1.0);',

        'void main(void) {',
        '   vec2 v;',
        '   vec2 sv = aVertexPosition * aScale;',
        '   v.x = (sv.x) * cos(aRotation) - (sv.y) * sin(aRotation);',
        '   v.y = (sv.x) * sin(aRotation) + (sv.y) * cos(aRotation);',
        '   v = ( uMatrix * vec3(v + aPositionCoord , 1.0) ).xy ;',
        '   gl_Position = vec4( ( v / projectionVector) + center , 0.0, 1.0);',
        '   vTextureCoord = aTextureCoord;',
      //  '   vec3 color = mod(vec3(aColor.y/65536.0, aColor.y/256.0, aColor.y), 256.0) / 256.0;',
        '   vColor = aColor;',
        '}'
    ];


    /**
    * @property {number} textureCount - A local texture counter for multi-texture shaders.
    */
    this.textureCount = 0;

    
    this.init();
};

/**
* Initialises the shader
* @method init
*
*/
PIXI.PixiFastShader.prototype.init = function()
{

    var gl = this.gl;

    var program = PIXI.compileProgram(gl, this.vertexSrc, this.fragmentSrc);
    
    gl.useProgram(program);

    // get and store the uniforms for the shader
    this.uSampler = gl.getUniformLocation(program, 'uSampler');

    this.projectionVector = gl.getUniformLocation(program, 'projectionVector');
    this.offsetVector = gl.getUniformLocation(program, 'offsetVector');
    this.dimensions = gl.getUniformLocation(program, 'dimensions');
    this.uMatrix = gl.getUniformLocation(program, 'uMatrix');

    // get and store the attributes
    this.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
    this.aPositionCoord = gl.getAttribLocation(program, 'aPositionCoord');

    this.aScale = gl.getAttribLocation(program, 'aScale');
    this.aRotation = gl.getAttribLocation(program, 'aRotation');

    this.aTextureCoord = gl.getAttribLocation(program, 'aTextureCoord');
    this.colorAttribute = gl.getAttribLocation(program, 'aColor');
   

   
    // Begin worst hack eva //

    // WHY??? ONLY on my chrome pixel the line above returns -1 when using filters?
    // maybe its somthing to do with the current state of the gl context.
    // Im convinced this is a bug in the chrome browser as there is NO reason why this should be returning -1 especially as it only manifests on my chrome pixel
    // If theres any webGL people that know why could happen please help :)
    if(this.colorAttribute === -1)
    {
        this.colorAttribute = 2;
    }

    this.attributes = [this.aVertexPosition, this.aPositionCoord,  this.aScale, this.aRotation, this.aTextureCoord, this.colorAttribute];
    
    // End worst hack eva //


    this.program = program;
};

/**
* Destroys the shader
* @method destroy
*
*/
PIXI.PixiFastShader.prototype.destroy = function()
{
    this.gl.deleteProgram( this.program );
    this.uniforms = null;
    this.gl = null;

    this.attributes = null;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


PIXI.StripShader = function()
{
    /**
    * @property {any} program - The WebGL program.
    */
    this.program = null;

    /**
     * @property {array} fragmentSrc - The fragment shader.
     */
    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying float vColor;',
        'uniform float alpha;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y));',
        '   gl_FragColor = gl_FragColor * alpha;',
        '}'
    ];

    /**
    * @property {array} fragmentSrc - The fragment shader.
    */
    this.vertexSrc = [
        'attribute vec2 aVertexPosition;',
        'attribute vec2 aTextureCoord;',
        'attribute float aColor;',
        'uniform mat3 translationMatrix;',
        'uniform vec2 projectionVector;',
        'varying vec2 vTextureCoord;',
        'uniform vec2 offsetVector;',
        'varying float vColor;',

        'void main(void) {',
        '   vec3 v = translationMatrix * vec3(aVertexPosition, 1.0);',
        '   v -= offsetVector.xyx;',
        '   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / projectionVector.y + 1.0 , 0.0, 1.0);',
        '   vTextureCoord = aTextureCoord;',
        '   vColor = aColor;',
        '}'
    ];
};

/**
* Initialises the shader
* @method init
*
*/
PIXI.StripShader.prototype.init = function()
{

    var gl = PIXI.gl;

    var program = PIXI.compileProgram(gl, this.vertexSrc, this.fragmentSrc);
    gl.useProgram(program);

    // get and store the uniforms for the shader
    this.uSampler = gl.getUniformLocation(program, 'uSampler');
    this.projectionVector = gl.getUniformLocation(program, 'projectionVector');
    this.offsetVector = gl.getUniformLocation(program, 'offsetVector');
    this.colorAttribute = gl.getAttribLocation(program, 'aColor');
    //this.dimensions = gl.getUniformLocation(this.program, 'dimensions');

    // get and store the attributes
    this.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
    this.aTextureCoord = gl.getAttribLocation(program, 'aTextureCoord');

    this.translationMatrix = gl.getUniformLocation(program, 'translationMatrix');
    this.alpha = gl.getUniformLocation(program, 'alpha');

    this.program = program;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class PrimitiveShader
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.PrimitiveShader = function(gl)
{
    /**
     * @property gl
     * @type WebGLContext
     */
    this.gl = gl;

    /**
    * @property {any} program - The WebGL program.
    */
    this.program = null;

    /**
     * @property fragmentSrc
     * @type Array
     */
    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec4 vColor;',

        'void main(void) {',
        '   gl_FragColor = vColor;',
        '}'
    ];

    /**
     * @property vertexSrc
     * @type Array
     */
    this.vertexSrc  = [
        'attribute vec2 aVertexPosition;',
        'attribute vec4 aColor;',
        'uniform mat3 translationMatrix;',
        'uniform vec2 projectionVector;',
        'uniform vec2 offsetVector;',
        'uniform float alpha;',
        'uniform vec3 tint;',
        'varying vec4 vColor;',

        'void main(void) {',
        '   vec3 v = translationMatrix * vec3(aVertexPosition , 1.0);',
        '   v -= offsetVector.xyx;',
        '   gl_Position = vec4( v.x / projectionVector.x -1.0, v.y / -projectionVector.y + 1.0 , 0.0, 1.0);',
        '   vColor = aColor * vec4(tint * alpha, alpha);',
        '}'
    ];

    this.init();
};

/**
* Initialises the shader
* @method init
*
*/
PIXI.PrimitiveShader.prototype.init = function()
{

    var gl = this.gl;

    var program = PIXI.compileProgram(gl, this.vertexSrc, this.fragmentSrc);
    gl.useProgram(program);

    // get and store the uniforms for the shader
    this.projectionVector = gl.getUniformLocation(program, 'projectionVector');
    this.offsetVector = gl.getUniformLocation(program, 'offsetVector');
    this.tintColor = gl.getUniformLocation(program, 'tint');


    // get and store the attributes
    this.aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
    this.colorAttribute = gl.getAttribLocation(program, 'aColor');

    this.attributes = [this.aVertexPosition, this.colorAttribute];

    this.translationMatrix = gl.getUniformLocation(program, 'translationMatrix');
    this.alpha = gl.getUniformLocation(program, 'alpha');

    this.program = program;
};

/**
* Destroys the shader
* @method destroy
*
*/
PIXI.PrimitiveShader.prototype.destroy = function()
{
    this.gl.deleteProgram( this.program );
    this.uniforms = null;
    this.gl = null;

    this.attribute = null;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * A set of functions used by the webGL renderer to draw the primitive graphics data
 *
 * @class WebGLGraphics
 * @private
 * @static
 */
PIXI.WebGLGraphics = function()
{

};

/**
 * Renders the graphics object
 *
 * @static
 * @private
 * @method renderGraphics
 * @param graphics {Graphics}
 * @param renderSession {Object}
 */
PIXI.WebGLGraphics.renderGraphics = function(graphics, renderSession)//projection, offset)
{
    var gl = renderSession.gl;
    var projection = renderSession.projection,
        offset = renderSession.offset,
        shader = renderSession.shaderManager.primitiveShader;

    if(!graphics._webGL[gl.id])graphics._webGL[gl.id] = {points:[], indices:[], lastIndex:0,
                                           buffer:gl.createBuffer(),
                                           indexBuffer:gl.createBuffer()};

    var webGL = graphics._webGL[gl.id];

    if(graphics.dirty)
    {
        graphics.dirty = false;

        if(graphics.clearDirty)
        {
            graphics.clearDirty = false;

            webGL.lastIndex = 0;
            webGL.points = [];
            webGL.indices = [];

        }

        PIXI.WebGLGraphics.updateGraphics(graphics, gl);
    }

    renderSession.shaderManager.activatePrimitiveShader();

    // This  could be speeded up for sure!

    // set the matrix transform
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniformMatrix3fv(shader.translationMatrix, false, graphics.worldTransform.toArray(true));

    gl.uniform2f(shader.projectionVector, projection.x, -projection.y);
    gl.uniform2f(shader.offsetVector, -offset.x, -offset.y);

    gl.uniform3fv(shader.tintColor, PIXI.hex2rgb(graphics.tint));

    gl.uniform1f(shader.alpha, graphics.worldAlpha);
    gl.bindBuffer(gl.ARRAY_BUFFER, webGL.buffer);

    gl.vertexAttribPointer(shader.aVertexPosition, 2, gl.FLOAT, false, 4 * 6, 0);
    gl.vertexAttribPointer(shader.colorAttribute, 4, gl.FLOAT, false,4 * 6, 2 * 4);

    // set the index buffer!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webGL.indexBuffer);

    gl.drawElements(gl.TRIANGLE_STRIP,  webGL.indices.length, gl.UNSIGNED_SHORT, 0 );

    renderSession.shaderManager.deactivatePrimitiveShader();

    // return to default shader...
//  PIXI.activateShader(PIXI.defaultShader);
};

/**
 * Updates the graphics object
 *
 * @static
 * @private
 * @method updateGraphics
 * @param graphicsData {Graphics} The graphics object to update
 * @param gl {WebGLContext} the current WebGL drawing context
 */
PIXI.WebGLGraphics.updateGraphics = function(graphics, gl)
{
    var webGL = graphics._webGL[gl.id];
    
    for (var i = webGL.lastIndex; i < graphics.graphicsData.length; i++)
    {
        var data = graphics.graphicsData[i];

        if(data.type === PIXI.Graphics.POLY)
        {
            if(data.fill)
            {
                if(data.points.length>3)
                    PIXI.WebGLGraphics.buildPoly(data, webGL);
            }

            if(data.lineWidth > 0)
            {
                PIXI.WebGLGraphics.buildLine(data, webGL);
            }
        }
        else if(data.type === PIXI.Graphics.RECT)
        {
            PIXI.WebGLGraphics.buildRectangle(data, webGL);
        }
        else if(data.type === PIXI.Graphics.CIRC || data.type === PIXI.Graphics.ELIP)
        {
            PIXI.WebGLGraphics.buildCircle(data, webGL);
        }
    }

    webGL.lastIndex = graphics.graphicsData.length;

   

    webGL.glPoints = new Float32Array(webGL.points);

    gl.bindBuffer(gl.ARRAY_BUFFER, webGL.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, webGL.glPoints, gl.STATIC_DRAW);

    webGL.glIndicies = new Uint16Array(webGL.indices);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, webGL.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, webGL.glIndicies, gl.STATIC_DRAW);
};

/**
 * Builds a rectangle to draw
 *
 * @static
 * @private
 * @method buildRectangle
 * @param graphicsData {Graphics} The graphics object containing all the necessary properties
 * @param webGLData {Object}
 */
PIXI.WebGLGraphics.buildRectangle = function(graphicsData, webGLData)
{
    // --- //
    // need to convert points to a nice regular data
    //
    var rectData = graphicsData.points;
    var x = rectData[0];
    var y = rectData[1];
    var width = rectData[2];
    var height = rectData[3];


    if(graphicsData.fill)
    {
        var color = PIXI.hex2rgb(graphicsData.fillColor);
        var alpha = graphicsData.fillAlpha;

        var r = color[0] * alpha;
        var g = color[1] * alpha;
        var b = color[2] * alpha;

        var verts = webGLData.points;
        var indices = webGLData.indices;

        var vertPos = verts.length/6;

        // start
        verts.push(x, y);
        verts.push(r, g, b, alpha);

        verts.push(x + width, y);
        verts.push(r, g, b, alpha);

        verts.push(x , y + height);
        verts.push(r, g, b, alpha);

        verts.push(x + width, y + height);
        verts.push(r, g, b, alpha);

        // insert 2 dead triangles..
        indices.push(vertPos, vertPos, vertPos+1, vertPos+2, vertPos+3, vertPos+3);
    }

    if(graphicsData.lineWidth)
    {
        var tempPoints = graphicsData.points;

        graphicsData.points = [x, y,
                  x + width, y,
                  x + width, y + height,
                  x, y + height,
                  x, y];


        PIXI.WebGLGraphics.buildLine(graphicsData, webGLData);

        graphicsData.points = tempPoints;
    }
};

/**
 * Builds a circle to draw
 *
 * @static
 * @private
 * @method buildCircle
 * @param graphicsData {Graphics} The graphics object to draw
 * @param webGLData {Object}
 */
PIXI.WebGLGraphics.buildCircle = function(graphicsData, webGLData)
{
    
    // need to convert points to a nice regular data
    var rectData = graphicsData.points;
    var x = rectData[0];
    var y = rectData[1];
    var width = rectData[2];
    var height = rectData[3];

    var totalSegs = 40;
    var seg = (Math.PI * 2) / totalSegs ;

    var i = 0;

    if(graphicsData.fill)
    {
        var color = PIXI.hex2rgb(graphicsData.fillColor);
        var alpha = graphicsData.fillAlpha;

        var r = color[0] * alpha;
        var g = color[1] * alpha;
        var b = color[2] * alpha;

        var verts = webGLData.points;
        var indices = webGLData.indices;

        var vecPos = verts.length/6;

        indices.push(vecPos);

        for (i = 0; i < totalSegs + 1 ; i++)
        {
            verts.push(x,y, r, g, b, alpha);

            verts.push(x + Math.sin(seg * i) * width,
                       y + Math.cos(seg * i) * height,
                       r, g, b, alpha);

            indices.push(vecPos++, vecPos++);
        }

        indices.push(vecPos-1);
    }

    if(graphicsData.lineWidth)
    {
        var tempPoints = graphicsData.points;

        graphicsData.points = [];

        for (i = 0; i < totalSegs + 1; i++)
        {
            graphicsData.points.push(x + Math.sin(seg * i) * width,
                                     y + Math.cos(seg * i) * height);
        }

        PIXI.WebGLGraphics.buildLine(graphicsData, webGLData);

        graphicsData.points = tempPoints;
    }
};

/**
 * Builds a line to draw
 *
 * @static
 * @private
 * @method buildLine
 * @param graphicsData {Graphics} The graphics object containing all the necessary properties
 * @param webGLData {Object}
 */
PIXI.WebGLGraphics.buildLine = function(graphicsData, webGLData)
{
    // TODO OPTIMISE!
    var i = 0;

    var points = graphicsData.points;
    if(points.length === 0)return;

    // if the line width is an odd number add 0.5 to align to a whole pixel
    if(graphicsData.lineWidth%2)
    {
        for (i = 0; i < points.length; i++) {
            points[i] += 0.5;
        }
    }

    // get first and last point.. figure out the middle!
    var firstPoint = new PIXI.Point( points[0], points[1] );
    var lastPoint = new PIXI.Point( points[points.length - 2], points[points.length - 1] );

    // if the first point is the last point - gonna have issues :)
    if(firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y)
    {
        points.pop();
        points.pop();

        lastPoint = new PIXI.Point( points[points.length - 2], points[points.length - 1] );

        var midPointX = lastPoint.x + (firstPoint.x - lastPoint.x) *0.5;
        var midPointY = lastPoint.y + (firstPoint.y - lastPoint.y) *0.5;

        points.unshift(midPointX, midPointY);
        points.push(midPointX, midPointY);
    }

    var verts = webGLData.points;
    var indices = webGLData.indices;
    var length = points.length / 2;
    var indexCount = points.length;
    var indexStart = verts.length/6;

    // DRAW the Line
    var width = graphicsData.lineWidth / 2;

    // sort color
    var color = PIXI.hex2rgb(graphicsData.lineColor);
    var alpha = graphicsData.lineAlpha;
    var r = color[0] * alpha;
    var g = color[1] * alpha;
    var b = color[2] * alpha;

    var px, py, p1x, p1y, p2x, p2y, p3x, p3y;
    var perpx, perpy, perp2x, perp2y, perp3x, perp3y;
    var a1, b1, c1, a2, b2, c2;
    var denom, pdist, dist;

    p1x = points[0];
    p1y = points[1];

    p2x = points[2];
    p2y = points[3];

    perpx = -(p1y - p2y);
    perpy =  p1x - p2x;

    dist = Math.sqrt(perpx*perpx + perpy*perpy);

    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;

    // start
    verts.push(p1x - perpx , p1y - perpy,
                r, g, b, alpha);

    verts.push(p1x + perpx , p1y + perpy,
                r, g, b, alpha);

    for (i = 1; i < length-1; i++)
    {
        p1x = points[(i-1)*2];
        p1y = points[(i-1)*2 + 1];

        p2x = points[(i)*2];
        p2y = points[(i)*2 + 1];

        p3x = points[(i+1)*2];
        p3y = points[(i+1)*2 + 1];

        perpx = -(p1y - p2y);
        perpy = p1x - p2x;

        dist = Math.sqrt(perpx*perpx + perpy*perpy);
        perpx /= dist;
        perpy /= dist;
        perpx *= width;
        perpy *= width;

        perp2x = -(p2y - p3y);
        perp2y = p2x - p3x;

        dist = Math.sqrt(perp2x*perp2x + perp2y*perp2y);
        perp2x /= dist;
        perp2y /= dist;
        perp2x *= width;
        perp2y *= width;

        a1 = (-perpy + p1y) - (-perpy + p2y);
        b1 = (-perpx + p2x) - (-perpx + p1x);
        c1 = (-perpx + p1x) * (-perpy + p2y) - (-perpx + p2x) * (-perpy + p1y);
        a2 = (-perp2y + p3y) - (-perp2y + p2y);
        b2 = (-perp2x + p2x) - (-perp2x + p3x);
        c2 = (-perp2x + p3x) * (-perp2y + p2y) - (-perp2x + p2x) * (-perp2y + p3y);

        denom = a1*b2 - a2*b1;

        if(Math.abs(denom) < 0.1 )
        {

            denom+=10.1;
            verts.push(p2x - perpx , p2y - perpy,
                r, g, b, alpha);

            verts.push(p2x + perpx , p2y + perpy,
                r, g, b, alpha);

            continue;
        }

        px = (b1*c2 - b2*c1)/denom;
        py = (a2*c1 - a1*c2)/denom;


        pdist = (px -p2x) * (px -p2x) + (py -p2y) + (py -p2y);


        if(pdist > 140 * 140)
        {
            perp3x = perpx - perp2x;
            perp3y = perpy - perp2y;

            dist = Math.sqrt(perp3x*perp3x + perp3y*perp3y);
            perp3x /= dist;
            perp3y /= dist;
            perp3x *= width;
            perp3y *= width;

            verts.push(p2x - perp3x, p2y -perp3y);
            verts.push(r, g, b, alpha);

            verts.push(p2x + perp3x, p2y +perp3y);
            verts.push(r, g, b, alpha);

            verts.push(p2x - perp3x, p2y -perp3y);
            verts.push(r, g, b, alpha);

            indexCount++;
        }
        else
        {

            verts.push(px , py);
            verts.push(r, g, b, alpha);

            verts.push(p2x - (px-p2x), p2y - (py - p2y));
            verts.push(r, g, b, alpha);
        }
    }

    p1x = points[(length-2)*2];
    p1y = points[(length-2)*2 + 1];

    p2x = points[(length-1)*2];
    p2y = points[(length-1)*2 + 1];

    perpx = -(p1y - p2y);
    perpy = p1x - p2x;

    dist = Math.sqrt(perpx*perpx + perpy*perpy);
    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;

    verts.push(p2x - perpx , p2y - perpy);
    verts.push(r, g, b, alpha);

    verts.push(p2x + perpx , p2y + perpy);
    verts.push(r, g, b, alpha);

    indices.push(indexStart);

    for (i = 0; i < indexCount; i++)
    {
        indices.push(indexStart++);
    }

    indices.push(indexStart-1);
};

/**
 * Builds a polygon to draw
 *
 * @static
 * @private
 * @method buildPoly
 * @param graphicsData {Graphics} The graphics object containing all the necessary properties
 * @param webGLData {Object}
 */
PIXI.WebGLGraphics.buildPoly = function(graphicsData, webGLData)
{
    var points = graphicsData.points;
    if(points.length < 6)return;

    // get first and last point.. figure out the middle!
    var verts = webGLData.points;
    var indices = webGLData.indices;

    var length = points.length / 2;

    // sort color
    var color = PIXI.hex2rgb(graphicsData.fillColor);
    var alpha = graphicsData.fillAlpha;
    var r = color[0] * alpha;
    var g = color[1] * alpha;
    var b = color[2] * alpha;

    var triangles = PIXI.PolyK.Triangulate(points);

    var vertPos = verts.length / 6;

    var i = 0;

    for (i = 0; i < triangles.length; i+=3)
    {
        indices.push(triangles[i] + vertPos);
        indices.push(triangles[i] + vertPos);
        indices.push(triangles[i+1] + vertPos);
        indices.push(triangles[i+2] +vertPos);
        indices.push(triangles[i+2] + vertPos);
    }

    for (i = 0; i < length; i++)
    {
        verts.push(points[i * 2], points[i * 2 + 1],
                   r, g, b, alpha);
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.glContexts = []; // this is where we store the webGL contexts for easy access.

/**
 * the WebGLRenderer draws the stage and all its content onto a webGL enabled canvas. This renderer
 * should be used for browsers that support webGL. This Render works by automatically managing webGLBatch's.
 * So no need for Sprite Batch's or Sprite Cloud's
 * Dont forget to add the view to your DOM or you will not see anything :)
 *
 * @class WebGLRenderer
 * @constructor
 * @param width=0 {Number} the width of the canvas view
 * @param height=0 {Number} the height of the canvas view
 * @param view {HTMLCanvasElement} the canvas to use as a view, optional
 * @param transparent=false {Boolean} If the render view is transparent, default false
 * @param antialias=false {Boolean} sets antialias (only applicable in chrome at the moment)
 *
 */
PIXI.WebGLRenderer = function(width, height, view, transparent, antialias)
{
    if(!PIXI.defaultRenderer)PIXI.defaultRenderer = this;

    this.type = PIXI.WEBGL_RENDERER;

    // do a catch.. only 1 webGL renderer..
    /**
     * Whether the render view is transparent
     *
     * @property transparent
     * @type Boolean
     */
    this.transparent = !!transparent;

    /**
     * The width of the canvas view
     *
     * @property width
     * @type Number
     * @default 800
     */
    this.width = width || 800;

    /**
     * The height of the canvas view
     *
     * @property height
     * @type Number
     * @default 600
     */
    this.height = height || 600;

    /**
     * The canvas element that everything is drawn to
     *
     * @property view
     * @type HTMLCanvasElement
     */
    this.view = view || document.createElement( 'canvas' );
    this.view.width = this.width;
    this.view.height = this.height;

    // deal with losing context..
    this.contextLost = this.handleContextLost.bind(this);
    this.contextRestoredLost = this.handleContextRestored.bind(this);
    
    this.view.addEventListener('webglcontextlost', this.contextLost, false);
    this.view.addEventListener('webglcontextrestored', this.contextRestoredLost, false);

    this.options = {
        alpha: this.transparent,
        antialias:!!antialias, // SPEED UP??
        premultipliedAlpha:!!transparent,
        stencil:true
    };

    //try 'experimental-webgl'
    try {
        this.gl = this.view.getContext('experimental-webgl',  this.options);
    } catch (e) {
        //try 'webgl'
        try {
            this.gl = this.view.getContext('webgl',  this.options);
        } catch (e2) {
            // fail, not able to get a context
            throw new Error(' This browser does not support webGL. Try using the canvas renderer' + this);
        }
    }

    var gl = this.gl;
    this.glContextId = gl.id = PIXI.WebGLRenderer.glContextId ++;

    PIXI.glContexts[this.glContextId] = gl;

    if(!PIXI.blendModesWebGL)
    {
        PIXI.blendModesWebGL = [];

        PIXI.blendModesWebGL[PIXI.blendModes.NORMAL]        = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.ADD]           = [gl.SRC_ALPHA, gl.DST_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.MULTIPLY]      = [gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.SCREEN]        = [gl.SRC_ALPHA, gl.ONE];
        PIXI.blendModesWebGL[PIXI.blendModes.OVERLAY]       = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.DARKEN]        = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.LIGHTEN]       = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.COLOR_DODGE]   = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.COLOR_BURN]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.HARD_LIGHT]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.SOFT_LIGHT]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.DIFFERENCE]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.EXCLUSION]     = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.HUE]           = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.SATURATION]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.COLOR]         = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
        PIXI.blendModesWebGL[PIXI.blendModes.LUMINOSITY]    = [gl.ONE,       gl.ONE_MINUS_SRC_ALPHA];
    }




    this.projection = new PIXI.Point();
    this.projection.x =  this.width/2;
    this.projection.y =  -this.height/2;

    this.offset = new PIXI.Point(0, 0);

    this.resize(this.width, this.height);
    this.contextLost = false;

    // time to create the render managers! each one focuses on managine a state in webGL
    this.shaderManager = new PIXI.WebGLShaderManager(gl);                   // deals with managing the shader programs and their attribs
    this.spriteBatch = new PIXI.WebGLSpriteBatch(gl);                       // manages the rendering of sprites
    this.maskManager = new PIXI.WebGLMaskManager(gl);                       // manages the masks using the stencil buffer
    this.filterManager = new PIXI.WebGLFilterManager(gl, this.transparent); // manages the filters

    this.renderSession = {};
    this.renderSession.gl = this.gl;
    this.renderSession.drawCount = 0;
    this.renderSession.shaderManager = this.shaderManager;
    this.renderSession.maskManager = this.maskManager;
    this.renderSession.filterManager = this.filterManager;
    this.renderSession.spriteBatch = this.spriteBatch;
    this.renderSession.renderer = this;

    gl.useProgram(this.shaderManager.defaultShader.program);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    gl.enable(gl.BLEND);
    gl.colorMask(true, true, true, this.transparent);
};

// constructor
PIXI.WebGLRenderer.prototype.constructor = PIXI.WebGLRenderer;

/**
 * Renders the stage to its webGL view
 *
 * @method render
 * @param stage {Stage} the Stage element to be rendered
 */
PIXI.WebGLRenderer.prototype.render = function(stage)
{
    if(this.contextLost)return;


    // if rendering a new stage clear the batches..
    if(this.__stage !== stage)
    {
        if(stage.interactive)stage.interactionManager.removeEvents();

        // TODO make this work
        // dont think this is needed any more?
        this.__stage = stage;
    }

    // update any textures this includes uvs and uploading them to the gpu
    PIXI.WebGLRenderer.updateTextures();

    // update the scene graph
    stage.updateTransform();


    // interaction
    if(stage._interactive)
    {
        //need to add some events!
        if(!stage._interactiveEventsAdded)
        {
            stage._interactiveEventsAdded = true;
            stage.interactionManager.setTarget(this);
        }
    }
    
    var gl = this.gl;

    // -- Does this need to be set every frame? -- //
    //gl.colorMask(true, true, true, this.transparent);
    gl.viewport(0, 0, this.width, this.height);

    // make sure we are bound to the main frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if(this.transparent)
    {
        gl.clearColor(0, 0, 0, 0);
    }
    else
    {
        gl.clearColor(stage.backgroundColorSplit[0],stage.backgroundColorSplit[1],stage.backgroundColorSplit[2], 1);
    }


    gl.clear(gl.COLOR_BUFFER_BIT);

    this.renderDisplayObject( stage, this.projection );

    // interaction
    if(stage.interactive)
    {
        //need to add some events!
        if(!stage._interactiveEventsAdded)
        {
            stage._interactiveEventsAdded = true;
            stage.interactionManager.setTarget(this);
        }
    }
    else
    {
        if(stage._interactiveEventsAdded)
        {
            stage._interactiveEventsAdded = false;
            stage.interactionManager.setTarget(this);
        }
    }

    /*
    //can simulate context loss in Chrome like so:
     this.view.onmousedown = function(ev) {
     console.dir(this.gl.getSupportedExtensions());
        var ext = (
            gl.getExtension("WEBGL_scompressed_texture_s3tc")
       // gl.getExtension("WEBGL_compressed_texture_s3tc") ||
       // gl.getExtension("MOZ_WEBGL_compressed_texture_s3tc") ||
       // gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc")
     );
     console.dir(ext);
     var loseCtx = this.gl.getExtension("WEBGL_lose_context");
      console.log("killing context");
      loseCtx.loseContext();
     setTimeout(function() {
          console.log("restoring context...");
          loseCtx.restoreContext();
      }.bind(this), 1000);
     }.bind(this);
     */
};

/**
 * Renders a display Object
 *
 * @method renderDIsplayObject
 * @param displayObject {DisplayObject} The DisplayObject to render
 * @param projection {Point} The projection
 * @param buffer {Array} a standard WebGL buffer 
 */
PIXI.WebGLRenderer.prototype.renderDisplayObject = function(displayObject, projection, buffer)
{
    // reset the render session data..
    this.renderSession.drawCount = 0;
    this.renderSession.currentBlendMode = 9999;

    this.renderSession.projection = projection;
    this.renderSession.offset = this.offset;

    // start the sprite batch
    this.spriteBatch.begin(this.renderSession);

    // start the filter manager
    this.filterManager.begin(this.renderSession, buffer);

    // render the scene!
    displayObject._renderWebGL(this.renderSession);

    // finish the sprite batch
    this.spriteBatch.end();
};

/**
 * Updates the textures loaded into this webgl renderer
 *
 * @static
 * @method updateTextures
 * @private
 */
PIXI.WebGLRenderer.updateTextures = function()
{
    var i = 0;

    //TODO break this out into a texture manager...
    //for (i = 0; i < PIXI.texturesToUpdate.length; i++)
    //    PIXI.WebGLRenderer.updateTexture(PIXI.texturesToUpdate[i]);


    for (i=0; i < PIXI.Texture.frameUpdates.length; i++)
        PIXI.WebGLRenderer.updateTextureFrame(PIXI.Texture.frameUpdates[i]);

    for (i = 0; i < PIXI.texturesToDestroy.length; i++)
        PIXI.WebGLRenderer.destroyTexture(PIXI.texturesToDestroy[i]);

    PIXI.texturesToUpdate.length = 0;
    PIXI.texturesToDestroy.length = 0;
    PIXI.Texture.frameUpdates.length = 0;
};

/**
 * Destroys a loaded webgl texture
 *
 * @method destroyTexture
 * @param texture {Texture} The texture to update
 * @private
 */
PIXI.WebGLRenderer.destroyTexture = function(texture)
{
    //TODO break this out into a texture manager...

    for (var i = texture._glTextures.length - 1; i >= 0; i--)
    {
        var glTexture = texture._glTextures[i];
        var gl = PIXI.glContexts[i];

        if(gl && glTexture)
        {
            gl.deleteTexture(glTexture);
        }
    }

    texture._glTextures.length = 0;
};

/**
 *
 * @method updateTextureFrame
 * @param texture {Texture} The texture to update the frame from
 * @private
 */
PIXI.WebGLRenderer.updateTextureFrame = function(texture)
{
    texture.updateFrame = false;

    // now set the uvs. Figured that the uv data sits with a texture rather than a sprite.
    // so uv data is stored on the texture itself
    texture._updateWebGLuvs();
};

/**
 * resizes the webGL view to the specified width and height
 *
 * @method resize
 * @param width {Number} the new width of the webGL view
 * @param height {Number} the new height of the webGL view
 */
PIXI.WebGLRenderer.prototype.resize = function(width, height)
{
    this.width = width;
    this.height = height;

    this.view.width = width;
    this.view.height = height;

    this.gl.viewport(0, 0, this.width, this.height);

    this.projection.x =  this.width/2;
    this.projection.y =  -this.height/2;
};

/**
 * Creates a WebGL texture
 *
 * @method createWebGLTexture
 * @param texture {Texture} the texture to render
 * @param gl {webglContext} the WebGL context
 * @static
 */
PIXI.createWebGLTexture = function(texture, gl)
{


    if(texture.hasLoaded)
    {
        texture._glTextures[gl.id] = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id]);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST);

        // reguler...

        if(!texture._powerOf2)
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        else
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    return  texture._glTextures[gl.id];
};

/**
 * Updates a WebGL texture
 *
 * @method updateWebGLTexture
 * @param texture {Texture} the texture to update
 * @param gl {webglContext} the WebGL context
 * @private
 */
PIXI.updateWebGLTexture = function(texture, gl)
{
    if( texture._glTextures[gl.id] )
    {
        gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id]);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST);

        // reguler...

        if(!texture._powerOf2)
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        else
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    
};

/**
 * Handles a lost webgl context
 *
 * @method handleContextLost
 * @param event {Event}
 * @private
 */
PIXI.WebGLRenderer.prototype.handleContextLost = function(event)
{
    event.preventDefault();
    this.contextLost = true;
};

/**
 * Handles a restored webgl context
 *
 * @method handleContextRestored
 * @param event {Event}
 * @private
 */
PIXI.WebGLRenderer.prototype.handleContextRestored = function()
{

    //try 'experimental-webgl'
    try {
        this.gl = this.view.getContext('experimental-webgl',  this.options);
    } catch (e) {
        //try 'webgl'
        try {
            this.gl = this.view.getContext('webgl',  this.options);
        } catch (e2) {
            // fail, not able to get a context
            throw new Error(' This browser does not support webGL. Try using the canvas renderer' + this);
        }
    }

    var gl = this.gl;
    gl.id = PIXI.WebGLRenderer.glContextId ++;



    // need to set the context...
    this.shaderManager.setContext(gl);
    this.spriteBatch.setContext(gl);
    this.maskManager.setContext(gl);
    this.filterManager.setContext(gl);


    this.renderSession.gl = this.gl;

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    gl.enable(gl.BLEND);
    gl.colorMask(true, true, true, this.transparent);

    this.gl.viewport(0, 0, this.width, this.height);

    for(var key in PIXI.TextureCache)
    {
        var texture = PIXI.TextureCache[key].baseTexture;
        texture._glTextures = [];
    }

    /**
     * Whether the context was lost 
     * @property contextLost
     * @type Boolean
     */
    this.contextLost = false;

};

/**
 * Removes everything from the renderer (event listeners, spritebatch, etc...)
 *
 * @method destroy
 */
PIXI.WebGLRenderer.prototype.destroy = function()
{

    // deal with losing context..
    
    // remove listeners
    this.view.removeEventListener('webglcontextlost', this.contextLost);
    this.view.removeEventListener('webglcontextrestored', this.contextRestoredLost);

    PIXI.glContexts[this.glContextId] = null;

    this.projection = null;
    this.offset = null;

    // time to create the render managers! each one focuses on managine a state in webGL
    this.shaderManager.destroy();
    this.spriteBatch.destroy();
    this.maskManager.destroy();
    this.filterManager.destroy();

    this.shaderManager = null;
    this.spriteBatch = null;
    this.maskManager = null;
    this.filterManager = null;
    
    this.gl = null;
    //
    this.renderSession = null;
};


PIXI.WebGLRenderer.glContextId = 0;

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */
 

/**
* @class WebGLMaskManager
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
* @private
*/
PIXI.WebGLMaskManager = function(gl)
{
    this.maskStack = [];
    this.maskPosition = 0;

    this.setContext(gl);
};

/**
* Sets the drawing context to the one given in parameter
* @method setContext 
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.WebGLMaskManager.prototype.setContext = function(gl)
{
    this.gl = gl;
};

/**
* Applies the Mask and adds it to the current filter stack
* @method pushMask
* @param maskData {Array}
* @param renderSession {RenderSession}
*/
PIXI.WebGLMaskManager.prototype.pushMask = function(maskData, renderSession)
{
    var gl = this.gl;

    if(this.maskStack.length === 0)
    {
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.ALWAYS,1,1);
    }
    
  //  maskData.visible = false;

    this.maskStack.push(maskData);
    
    gl.colorMask(false, false, false, true);
    gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);

    PIXI.WebGLGraphics.renderGraphics(maskData, renderSession);

    gl.colorMask(true, true, true, true);
    gl.stencilFunc(gl.NOTEQUAL,0, this.maskStack.length);
    gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
};

/**
* Removes the last filter from the filter stack and doesn't return it
* @method popMask
*
* @param renderSession {RenderSession} an object containing all the useful parameters
*/
PIXI.WebGLMaskManager.prototype.popMask = function(renderSession)
{
    var gl = this.gl;

    var maskData = this.maskStack.pop();

    if(maskData)
    {
        gl.colorMask(false, false, false, false);

        //gl.stencilFunc(gl.ALWAYS,1,1);
        gl.stencilOp(gl.KEEP,gl.KEEP,gl.DECR);

        PIXI.WebGLGraphics.renderGraphics(maskData, renderSession);

        gl.colorMask(true, true, true, true);
        gl.stencilFunc(gl.NOTEQUAL,0,this.maskStack.length);
        gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
    }
   
    if(this.maskStack.length === 0)gl.disable(gl.STENCIL_TEST);
};

/**
* Destroys the mask stack
* @method destroy
*/
PIXI.WebGLMaskManager.prototype.destroy = function()
{
    this.maskStack = null;
    this.gl = null;
};
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class WebGLShaderManager
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
* @private
*/
PIXI.WebGLShaderManager = function(gl)
{

    this.maxAttibs = 10;
    this.attribState = [];
    this.tempAttribState = [];

    for (var i = 0; i < this.maxAttibs; i++) {
        this.attribState[i] = false;
    }

    this.setContext(gl);
    // the final one is used for the rendering strips
    //this.stripShader = new PIXI.StripShader(gl);
};


/**
* Initialises the context and the properties
* @method setContext 
* @param gl {WebGLContext} the current WebGL drawing context
* @param transparent {Boolean} Whether or not the drawing context should be transparent
*/
PIXI.WebGLShaderManager.prototype.setContext = function(gl)
{
    this.gl = gl;
    
    // the next one is used for rendering primatives
    this.primitiveShader = new PIXI.PrimitiveShader(gl);

    // this shader is used for the default sprite rendering
    this.defaultShader = new PIXI.PixiShader(gl);

    // this shader is used for the fast sprite rendering
    this.fastShader = new PIXI.PixiFastShader(gl);


    this.activateShader(this.defaultShader);
};


/**
* Takes the attributes given in parameters 
* @method setAttribs
* @param attribs {Array} attribs 
*/
PIXI.WebGLShaderManager.prototype.setAttribs = function(attribs)
{
    // reset temp state

    var i;

    for (i = 0; i < this.tempAttribState.length; i++)
    {
        this.tempAttribState[i] = false;
    }

    // set the new attribs
    for (i = 0; i < attribs.length; i++)
    {
        var attribId = attribs[i];
        this.tempAttribState[attribId] = true;
    }

    var gl = this.gl;

    for (i = 0; i < this.attribState.length; i++)
    {

        if(this.attribState[i] !== this.tempAttribState[i])
        {
            this.attribState[i] = this.tempAttribState[i];

            if(this.tempAttribState[i])
            {
                gl.enableVertexAttribArray(i);
            }
            else
            {
                gl.disableVertexAttribArray(i);
            }
        }
    }
};

/**
* Sets-up the given shader 
*
* @method activateShader
* @param shader {Object} the shader that is going to be activated
*/
PIXI.WebGLShaderManager.prototype.activateShader = function(shader)
{
    //if(this.currentShader == shader)return;

    this.currentShader = shader;

    this.gl.useProgram(shader.program);
    this.setAttribs(shader.attributes);
  
};

/**
* Triggers the primitive shader
* @method activatePrimitiveShader
*/
PIXI.WebGLShaderManager.prototype.activatePrimitiveShader = function()
{
    var gl = this.gl;

    gl.useProgram(this.primitiveShader.program);

    this.setAttribs(this.primitiveShader.attributes);
    
};

/**
* Disable the primitive shader
* @method deactivatePrimitiveShader
*/
PIXI.WebGLShaderManager.prototype.deactivatePrimitiveShader = function()
{
    var gl = this.gl;

    gl.useProgram(this.defaultShader.program);

    this.setAttribs(this.defaultShader.attributes);
};

/**
* Destroys
* @method destroy
*/
PIXI.WebGLShaderManager.prototype.destroy = function()
{
    this.attribState = null;

    this.tempAttribState = null;

    this.primitiveShader.destroy();

    this.defaultShader.destroy();

    this.fastShader.destroy();

    this.gl = null;
};


/**
 * @author Mat Groves
 * 
 * Big thanks to the very clever Matt DesLauriers <mattdesl> https://github.com/mattdesl/
 * for creating the original pixi version!
 *
 * Heavily inspired by LibGDX's WebGLSpriteBatch:
 * https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/g2d/WebGLSpriteBatch.java
 */

 /**
 *
 * @class WebGLSpriteBatch
 * @private
 * @constructor
 * @param gl {WebGLContext} the current WebGL drawing context
 *
 */
PIXI.WebGLSpriteBatch = function(gl)
{

    /**
     * 
     *
     * @property vertSize
     * @type Number
     */
    this.vertSize = 6;

    /**
     * The number of images in the SpriteBatch before it flushes
     * @property size
     * @type Number
     */
    this.size = 2000;//Math.pow(2, 16) /  this.vertSize;

    //the total number of floats in our batch
    var numVerts = this.size * 4 *  this.vertSize;
    //the total number of indices in our batch
    var numIndices = this.size * 6;

    //vertex data

    /**
    * Holds the vertices
    *
    * @property vertices
    * @type Float32Array
    */
    this.vertices = new Float32Array(numVerts);

    //index data
    /**
     * Holds the indices
     *
     * @property indices
     * @type Uint16Array
     */
    this.indices = new Uint16Array(numIndices);
    
    this.lastIndexCount = 0;

    for (var i=0, j=0; i < numIndices; i += 6, j += 4)
    {
        this.indices[i + 0] = j + 0;
        this.indices[i + 1] = j + 1;
        this.indices[i + 2] = j + 2;
        this.indices[i + 3] = j + 0;
        this.indices[i + 4] = j + 2;
        this.indices[i + 5] = j + 3;
    }


    this.drawing = false;
    this.currentBatchSize = 0;
    this.currentBaseTexture = null;
    
    this.setContext(gl);
};

/**
* 
* @method setContext
*
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.WebGLSpriteBatch.prototype.setContext = function(gl)
{
    this.gl = gl;

    // create a couple of buffers
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    // 65535 is max index, so 65535 / 6 = 10922.


    //upload the index data
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);

    this.currentBlendMode = 99999;
};

/**
* 
* @method begin
*
* @param renderSession {RenderSession} the RenderSession
*/
PIXI.WebGLSpriteBatch.prototype.begin = function(renderSession)
{
    this.renderSession = renderSession;
    this.shader = this.renderSession.shaderManager.defaultShader;

    this.start();
};

/**
* 
* @method end
*
*/
PIXI.WebGLSpriteBatch.prototype.end = function()
{
    this.flush();
};

/**
* 
* @method render
* 
* @param sprite {Sprite} the sprite to render when using this spritebatch
*/
PIXI.WebGLSpriteBatch.prototype.render = function(sprite)
{
    var texture = sprite.texture;

    // check texture..
    if(texture.baseTexture !== this.currentBaseTexture || this.currentBatchSize >= this.size)
    {
        this.flush();
        this.currentBaseTexture = texture.baseTexture;
    }


    // check blend mode
    if(sprite.blendMode !== this.currentBlendMode)
    {
        this.setBlendMode(sprite.blendMode);
    }

    // get the uvs for the texture
    var uvs = sprite._uvs || sprite.texture._uvs;
    // if the uvs have not updated then no point rendering just yet!
    if(!uvs)return;

    // get the sprites current alpha
    var alpha = sprite.worldAlpha;
    var tint = sprite.tint;

    var verticies = this.vertices;


    // TODO trim??
    var aX = sprite.anchor.x;
    var aY = sprite.anchor.y;

    var w0, w1, h0, h1;
        
    if (sprite.texture.trim)
    {
        // if the sprite is trimmed then we need to add the extra space before transforming the sprite coords..
        var trim = sprite.texture.trim;

        w1 = trim.x - aX * trim.width;
        w0 = w1 + texture.frame.width;

        h1 = trim.y - aY * trim.height;
        h0 = h1 + texture.frame.height;

    }
    else
    {
        w0 = (texture.frame.width ) * (1-aX);
        w1 = (texture.frame.width ) * -aX;

        h0 = texture.frame.height * (1-aY);
        h1 = texture.frame.height * -aY;
    }

    var index = this.currentBatchSize * 4 * this.vertSize;

    var worldTransform = sprite.worldTransform;//.toArray();

    var a = worldTransform.a;//[0];
    var b = worldTransform.c;//[3];
    var c = worldTransform.b;//[1];
    var d = worldTransform.d;//[4];
    var tx = worldTransform.tx;//[2];
    var ty = worldTransform.ty;///[5];

    // xy
    verticies[index++] = a * w1 + c * h1 + tx;
    verticies[index++] = d * h1 + b * w1 + ty;
    // uv
    verticies[index++] = uvs.x0;
    verticies[index++] = uvs.y0;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // xy
    verticies[index++] = a * w0 + c * h1 + tx;
    verticies[index++] = d * h1 + b * w0 + ty;
    // uv
    verticies[index++] = uvs.x1;
    verticies[index++] = uvs.y1;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // xy
    verticies[index++] = a * w0 + c * h0 + tx;
    verticies[index++] = d * h0 + b * w0 + ty;
    // uv
    verticies[index++] = uvs.x2;
    verticies[index++] = uvs.y2;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // xy
    verticies[index++] = a * w1 + c * h0 + tx;
    verticies[index++] = d * h0 + b * w1 + ty;
    // uv
    verticies[index++] = uvs.x3;
    verticies[index++] = uvs.y3;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;
    
    // increment the batchsize
    this.currentBatchSize++;


};

/**
* Renders a tilingSprite using the spriteBatch
* @method renderTilingSprite
* 
* @param sprite {TilingSprite} the tilingSprite to render
*/
PIXI.WebGLSpriteBatch.prototype.renderTilingSprite = function(tilingSprite)
{
    var texture = tilingSprite.tilingTexture;

    if(texture.baseTexture !== this.currentBaseTexture || this.currentBatchSize >= this.size)
    {
        this.flush();
        this.currentBaseTexture = texture.baseTexture;
    }

     // check blend mode
    if(tilingSprite.blendMode !== this.currentBlendMode)
    {
        this.setBlendMode(tilingSprite.blendMode);
    }

     // set the textures uvs temporarily
    // TODO create a separate texture so that we can tile part of a texture

    if(!tilingSprite._uvs)tilingSprite._uvs = new PIXI.TextureUvs();

    var uvs = tilingSprite._uvs;

    tilingSprite.tilePosition.x %= texture.baseTexture.width * tilingSprite.tileScaleOffset.x;
    tilingSprite.tilePosition.y %= texture.baseTexture.height * tilingSprite.tileScaleOffset.y;

    var offsetX =  tilingSprite.tilePosition.x/(texture.baseTexture.width*tilingSprite.tileScaleOffset.x);
    var offsetY =  tilingSprite.tilePosition.y/(texture.baseTexture.height*tilingSprite.tileScaleOffset.y);

    var scaleX =  (tilingSprite.width / texture.baseTexture.width)  / (tilingSprite.tileScale.x * tilingSprite.tileScaleOffset.x);
    var scaleY =  (tilingSprite.height / texture.baseTexture.height) / (tilingSprite.tileScale.y * tilingSprite.tileScaleOffset.y);

    uvs.x0 = 0 - offsetX;
    uvs.y0 = 0 - offsetY;

    uvs.x1 = (1 * scaleX) - offsetX;
    uvs.y1 = 0 - offsetY;

    uvs.x2 = (1 * scaleX) - offsetX;
    uvs.y2 = (1 * scaleY) - offsetY;

    uvs.x3 = 0 - offsetX;
    uvs.y3 = (1 *scaleY) - offsetY;

    // get the tilingSprites current alpha
    var alpha = tilingSprite.worldAlpha;
    var tint = tilingSprite.tint;

    var  verticies = this.vertices;

    var width = tilingSprite.width;
    var height = tilingSprite.height;

    // TODO trim??
    var aX = tilingSprite.anchor.x; // - tilingSprite.texture.trim.x
    var aY = tilingSprite.anchor.y; //- tilingSprite.texture.trim.y
    var w0 = width * (1-aX);
    var w1 = width * -aX;

    var h0 = height * (1-aY);
    var h1 = height * -aY;

    var index = this.currentBatchSize * 4 * this.vertSize;

    var worldTransform = tilingSprite.worldTransform;

    var a = worldTransform.a;//[0];
    var b = worldTransform.c;//[3];
    var c = worldTransform.b;//[1];
    var d = worldTransform.d;//[4];
    var tx = worldTransform.tx;//[2];
    var ty = worldTransform.ty;///[5];

    // xy
    verticies[index++] = a * w1 + c * h1 + tx;
    verticies[index++] = d * h1 + b * w1 + ty;
    // uv
    verticies[index++] = uvs.x0;
    verticies[index++] = uvs.y0;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // xy
    verticies[index++] = a * w0 + c * h1 + tx;
    verticies[index++] = d * h1 + b * w0 + ty;
    // uv
    verticies[index++] = uvs.x1;
    verticies[index++] = uvs.y1;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;
    
    // xy
    verticies[index++] = a * w0 + c * h0 + tx;
    verticies[index++] = d * h0 + b * w0 + ty;
    // uv
    verticies[index++] = uvs.x2;
    verticies[index++] = uvs.y2;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // xy
    verticies[index++] = a * w1 + c * h0 + tx;
    verticies[index++] = d * h0 + b * w1 + ty;
    // uv
    verticies[index++] = uvs.x3;
    verticies[index++] = uvs.y3;
    // color
    verticies[index++] = alpha;
    verticies[index++] = tint;

    // increment the batchs
    this.currentBatchSize++;
};


/**
* Renders the content and empties the current batch
*
* @method flush
* 
*/
PIXI.WebGLSpriteBatch.prototype.flush = function()
{
    // If the batch is length 0 then return as there is nothing to draw
    if (this.currentBatchSize===0)return;

    var gl = this.gl;
    
    // bind the current texture
    gl.bindTexture(gl.TEXTURE_2D, this.currentBaseTexture._glTextures[gl.id] || PIXI.createWebGLTexture(this.currentBaseTexture, gl));

    // upload the verts to the buffer
    
    if(this.currentBatchSize > ( this.size * 0.5 ) )
    {
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
    }
    else
    {
        var view = this.vertices.subarray(0, this.currentBatchSize * 4 * this.vertSize);

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
    }

   // var view = this.vertices.subarray(0, this.currentBatchSize * 4 * this.vertSize);
    //gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
    
    // now draw those suckas!
    gl.drawElements(gl.TRIANGLES, this.currentBatchSize * 6, gl.UNSIGNED_SHORT, 0);
   
    // then reset the batch!
    this.currentBatchSize = 0;

    // increment the draw count
    this.renderSession.drawCount++;
};

/**
* 
* @method stop
*
*/
PIXI.WebGLSpriteBatch.prototype.stop = function()
{
    this.flush();
};

/**
* 
* @method start
*
*/
PIXI.WebGLSpriteBatch.prototype.start = function()
{
    var gl = this.gl;

    // bind the main texture
    gl.activeTexture(gl.TEXTURE0);

    // bind the buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // set the projection
    var projection = this.renderSession.projection;
    gl.uniform2f(this.shader.projectionVector, projection.x, projection.y);

    // set the pointers
    var stride =  this.vertSize * 4;
    gl.vertexAttribPointer(this.shader.aVertexPosition, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(this.shader.aTextureCoord, 2, gl.FLOAT, false, stride, 2 * 4);
    gl.vertexAttribPointer(this.shader.colorAttribute, 2, gl.FLOAT, false, stride, 4 * 4);

    // set the blend mode..
    if(this.currentBlendMode !== PIXI.blendModes.NORMAL)
    {
        this.setBlendMode(PIXI.blendModes.NORMAL);
    }
};

/**
* Sets-up the given blendMode from WebGL's point of view
* @method setBlendMode 
*
* @param blendMode {Number} the blendMode, should be a Pixi const, such as PIXI.BlendModes.ADD
*/
PIXI.WebGLSpriteBatch.prototype.setBlendMode = function(blendMode)
{
    this.flush();

    this.currentBlendMode = blendMode;
    
    var blendModeWebGL = PIXI.blendModesWebGL[this.currentBlendMode];
    this.gl.blendFunc(blendModeWebGL[0], blendModeWebGL[1]);
};

/**
* Destroys the SpriteBatch
* @method destroy
*/
PIXI.WebGLSpriteBatch.prototype.destroy = function()
{

    this.vertices = null;
    this.indices = null;
    
    this.gl.deleteBuffer( this.vertexBuffer );
    this.gl.deleteBuffer( this.indexBuffer );
    
    this.currentBaseTexture = null;
    
    this.gl = null;
};


/**
 * @author Mat Groves
 * 
 * Big thanks to the very clever Matt DesLauriers <mattdesl> https://github.com/mattdesl/
 * for creating the original pixi version!
 *
 * Heavily inspired by LibGDX's WebGLSpriteBatch:
 * https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/graphics/g2d/WebGLSpriteBatch.java
 */

PIXI.WebGLFastSpriteBatch = function(gl)
{
   

    this.vertSize = 10;
    this.maxSize = 6000;//Math.pow(2, 16) /  this.vertSize;
    this.size = this.maxSize;

    //the total number of floats in our batch
    var numVerts = this.size * 4 *  this.vertSize;
    //the total number of indices in our batch
    var numIndices = this.maxSize * 6;

     //vertex data
    this.vertices = new Float32Array(numVerts);
    //index data
    this.indices = new Uint16Array(numIndices);
    
    this.vertexBuffer = null;
    this.indexBuffer = null;

    this.lastIndexCount = 0;

    for (var i=0, j=0; i < numIndices; i += 6, j += 4)
    {
        this.indices[i + 0] = j + 0;
        this.indices[i + 1] = j + 1;
        this.indices[i + 2] = j + 2;
        this.indices[i + 3] = j + 0;
        this.indices[i + 4] = j + 2;
        this.indices[i + 5] = j + 3;
    }

    this.drawing = false;
    this.currentBatchSize = 0;
    this.currentBaseTexture = null;
   
    this.currentBlendMode = 0;
    this.renderSession = null;
    

    this.shader = null;

    this.matrix = null;

    this.setContext(gl);
};

PIXI.WebGLFastSpriteBatch.prototype.setContext = function(gl)
{
    this.gl = gl;

    // create a couple of buffers
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    // 65535 is max index, so 65535 / 6 = 10922.


    //upload the index data
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);

    this.currentBlendMode = 99999;
};

PIXI.WebGLFastSpriteBatch.prototype.begin = function(spriteBatch, renderSession)
{
    this.renderSession = renderSession;
    this.shader = this.renderSession.shaderManager.fastShader;

    this.matrix = spriteBatch.worldTransform.toArray(true);

    this.start();
};

PIXI.WebGLFastSpriteBatch.prototype.end = function()
{
    this.flush();
};


PIXI.WebGLFastSpriteBatch.prototype.render = function(spriteBatch)
{

    var children = spriteBatch.children;
    var sprite = children[0];

    // if the uvs have not updated then no point rendering just yet!
    
    // check texture.
    if(!sprite.texture._uvs)return;
   
    this.currentBaseTexture = sprite.texture.baseTexture;
    // check blend mode
    if(sprite.blendMode !== this.currentBlendMode)
    {
        this.setBlendMode(sprite.blendMode);
    }
    
    for(var i=0,j= children.length; i<j; i++)
    {
        this.renderSprite(children[i]);
    }

    this.flush();
};

PIXI.WebGLFastSpriteBatch.prototype.renderSprite = function(sprite)
{
    //sprite = children[i];
    if(!sprite.visible)return;
    
    // TODO trim??
    if(sprite.texture.baseTexture !== this.currentBaseTexture)
    {
        this.flush();
        this.currentBaseTexture = sprite.texture.baseTexture;
        
        if(!sprite.texture._uvs)return;
    }

    var uvs, verticies = this.vertices, width, height, w0, w1, h0, h1, index;

    uvs = sprite.texture._uvs;


    width = sprite.texture.frame.width;
    height = sprite.texture.frame.height;

    if (sprite.texture.trim)
    {
        // if the sprite is trimmed then we need to add the extra space before transforming the sprite coords..
        var trim = sprite.texture.trim;

        w1 = trim.x - sprite.anchor.x * trim.width;
        w0 = w1 + sprite.texture.frame.width;

        h1 = trim.y - sprite.anchor.y * trim.height;
        h0 = h1 + sprite.texture.frame.height;
    }
    else
    {
        w0 = (sprite.texture.frame.width ) * (1-sprite.anchor.x);
        w1 = (sprite.texture.frame.width ) * -sprite.anchor.x;

        h0 = sprite.texture.frame.height * (1-sprite.anchor.y);
        h1 = sprite.texture.frame.height * -sprite.anchor.y;
    }

    index = this.currentBatchSize * 4 * this.vertSize;

    // xy
    verticies[index++] = w1;
    verticies[index++] = h1;

    verticies[index++] = sprite.position.x;
    verticies[index++] = sprite.position.y;

    //scale
    verticies[index++] = sprite.scale.x;
    verticies[index++] = sprite.scale.y;

    //rotation
    verticies[index++] = sprite.rotation;

    // uv
    verticies[index++] = uvs.x0;
    verticies[index++] = uvs.y1;
    // color
    verticies[index++] = sprite.alpha;
 

    // xy
    verticies[index++] = w0;
    verticies[index++] = h1;

    verticies[index++] = sprite.position.x;
    verticies[index++] = sprite.position.y;

    //scale
    verticies[index++] = sprite.scale.x;
    verticies[index++] = sprite.scale.y;

     //rotation
    verticies[index++] = sprite.rotation;

    // uv
    verticies[index++] = uvs.x1;
    verticies[index++] = uvs.y1;
    // color
    verticies[index++] = sprite.alpha;
  

    // xy
    verticies[index++] = w0;
    verticies[index++] = h0;

    verticies[index++] = sprite.position.x;
    verticies[index++] = sprite.position.y;

    //scale
    verticies[index++] = sprite.scale.x;
    verticies[index++] = sprite.scale.y;

     //rotation
    verticies[index++] = sprite.rotation;

    // uv
    verticies[index++] = uvs.x2;
    verticies[index++] = uvs.y2;
    // color
    verticies[index++] = sprite.alpha;
 



    // xy
    verticies[index++] = w1;
    verticies[index++] = h0;

    verticies[index++] = sprite.position.x;
    verticies[index++] = sprite.position.y;

    //scale
    verticies[index++] = sprite.scale.x;
    verticies[index++] = sprite.scale.y;

     //rotation
    verticies[index++] = sprite.rotation;

    // uv
    verticies[index++] = uvs.x3;
    verticies[index++] = uvs.y3;
    // color
    verticies[index++] = sprite.alpha;

    // increment the batchs
    this.currentBatchSize++;

    if(this.currentBatchSize >= this.size)
    {
        this.flush();
    }
};

PIXI.WebGLFastSpriteBatch.prototype.flush = function()
{

    // If the batch is length 0 then return as there is nothing to draw
    if (this.currentBatchSize===0)return;

    var gl = this.gl;
    
    // bind the current texture

    if(!this.currentBaseTexture._glTextures[gl.id])PIXI.createWebGLTexture(this.currentBaseTexture, gl);

    gl.bindTexture(gl.TEXTURE_2D, this.currentBaseTexture._glTextures[gl.id]);// || PIXI.createWebGLTexture(this.currentBaseTexture, gl));

    // upload the verts to the buffer

   
    if(this.currentBatchSize > ( this.size * 0.5 ) )
    {
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
    }
    else
    {
        var view = this.vertices.subarray(0, this.currentBatchSize * 4 * this.vertSize);

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
    }
    
    
    // now draw those suckas!
    gl.drawElements(gl.TRIANGLES, this.currentBatchSize * 6, gl.UNSIGNED_SHORT, 0);
   
    // then reset the batch!
    this.currentBatchSize = 0;

    // increment the draw count
    this.renderSession.drawCount++;
};


PIXI.WebGLFastSpriteBatch.prototype.stop = function()
{
    this.flush();
};

PIXI.WebGLFastSpriteBatch.prototype.start = function()
{
    var gl = this.gl;

    // bind the main texture
    gl.activeTexture(gl.TEXTURE0);

    // bind the buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // set the projection
    var projection = this.renderSession.projection;
    gl.uniform2f(this.shader.projectionVector, projection.x, projection.y);

    // set the matrix
    gl.uniformMatrix3fv(this.shader.uMatrix, false, this.matrix);

    // set the pointers
    var stride =  this.vertSize * 4;

    gl.vertexAttribPointer(this.shader.aVertexPosition, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(this.shader.aPositionCoord, 2, gl.FLOAT, false, stride, 2 * 4);
    gl.vertexAttribPointer(this.shader.aScale, 2, gl.FLOAT, false, stride, 4 * 4);
    gl.vertexAttribPointer(this.shader.aRotation, 1, gl.FLOAT, false, stride, 6 * 4);
    gl.vertexAttribPointer(this.shader.aTextureCoord, 2, gl.FLOAT, false, stride, 7 * 4);
    gl.vertexAttribPointer(this.shader.colorAttribute, 1, gl.FLOAT, false, stride, 9 * 4);

    // set the blend mode..
    if(this.currentBlendMode !== PIXI.blendModes.NORMAL)
    {
        this.setBlendMode(PIXI.blendModes.NORMAL);
    }
};

PIXI.WebGLFastSpriteBatch.prototype.setBlendMode = function(blendMode)
{
    this.flush();

    this.currentBlendMode = blendMode;
    
    var blendModeWebGL = PIXI.blendModesWebGL[this.currentBlendMode];
    this.gl.blendFunc(blendModeWebGL[0], blendModeWebGL[1]);
};



/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class WebGLFilterManager
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
* @param transparent {Boolean} Whether or not the drawing context should be transparent
* @private
*/
PIXI.WebGLFilterManager = function(gl, transparent)
{
    this.transparent = transparent;

    this.filterStack = [];
    
    this.offsetX = 0;
    this.offsetY = 0;

    this.setContext(gl);
};

// API
/**
* Initialises the context and the properties
* @method setContext 
* @param gl {WebGLContext} the current WebGL drawing context
*/
PIXI.WebGLFilterManager.prototype.setContext = function(gl)
{
    this.gl = gl;
    this.texturePool = [];

    this.initShaderBuffers();
};

/**
* 
* @method begin
* @param renderSession {RenderSession} 
* @param buffer {ArrayBuffer} 
*/
PIXI.WebGLFilterManager.prototype.begin = function(renderSession, buffer)
{
    this.renderSession = renderSession;
    this.defaultShader = renderSession.shaderManager.defaultShader;

    var projection = this.renderSession.projection;
   // console.log(this.width)
    this.width = projection.x * 2;
    this.height = -projection.y * 2;
    this.buffer = buffer;
};

/**
* Applies the filter and adds it to the current filter stack
* @method pushFilter
* @param filterBlock {Object} the filter that will be pushed to the current filter stack
*/
PIXI.WebGLFilterManager.prototype.pushFilter = function(filterBlock)
{
    var gl = this.gl;

    var projection = this.renderSession.projection;
    var offset = this.renderSession.offset;

    filterBlock._filterArea = filterBlock.target.filterArea || filterBlock.target.getBounds();


    // filter program
    // OPTIMISATION - the first filter is free if its a simple color change?
    this.filterStack.push(filterBlock);

    var filter = filterBlock.filterPasses[0];

    this.offsetX += filterBlock._filterArea.x;
    this.offsetY += filterBlock._filterArea.y;

    var texture = this.texturePool.pop();
    if(!texture)
    {
        texture = new PIXI.FilterTexture(this.gl, this.width, this.height);
    }
    else
    {
        texture.resize(this.width, this.height);
    }

    gl.bindTexture(gl.TEXTURE_2D,  texture.texture);

    var filterArea = filterBlock._filterArea;// filterBlock.target.getBounds();///filterBlock.target.filterArea;

    var padidng = filter.padding;
    filterArea.x -= padidng;
    filterArea.y -= padidng;
    filterArea.width += padidng * 2;
    filterArea.height += padidng * 2;

    // cap filter to screen size..
    if(filterArea.x < 0)filterArea.x = 0;
    if(filterArea.width > this.width)filterArea.width = this.width;
    if(filterArea.y < 0)filterArea.y = 0;
    if(filterArea.height > this.height)filterArea.height = this.height;

    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  filterArea.width, filterArea.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, texture.frameBuffer);

    // set view port
    gl.viewport(0, 0, filterArea.width, filterArea.height);

    projection.x = filterArea.width/2;
    projection.y = -filterArea.height/2;

    offset.x = -filterArea.x;
    offset.y = -filterArea.y;

    // update projection
    gl.uniform2f(this.defaultShader.projectionVector, filterArea.width/2, -filterArea.height/2);
    gl.uniform2f(this.defaultShader.offsetVector, -filterArea.x, -filterArea.y);

    gl.colorMask(true, true, true, true);
    gl.clearColor(0,0,0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    filterBlock._glFilterTexture = texture;

};


/**
* Removes the last filter from the filter stack and doesn't return it
* @method popFilter
*/
PIXI.WebGLFilterManager.prototype.popFilter = function()
{
    var gl = this.gl;
    var filterBlock = this.filterStack.pop();
    var filterArea = filterBlock._filterArea;
    var texture = filterBlock._glFilterTexture;
    var projection = this.renderSession.projection;
    var offset = this.renderSession.offset;

    if(filterBlock.filterPasses.length > 1)
    {
        gl.viewport(0, 0, filterArea.width, filterArea.height);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        this.vertexArray[0] = 0;
        this.vertexArray[1] = filterArea.height;

        this.vertexArray[2] = filterArea.width;
        this.vertexArray[3] = filterArea.height;

        this.vertexArray[4] = 0;
        this.vertexArray[5] = 0;

        this.vertexArray[6] = filterArea.width;
        this.vertexArray[7] = 0;

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexArray);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        // now set the uvs..
        this.uvArray[2] = filterArea.width/this.width;
        this.uvArray[5] = filterArea.height/this.height;
        this.uvArray[6] = filterArea.width/this.width;
        this.uvArray[7] = filterArea.height/this.height;

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.uvArray);

        var inputTexture = texture;
        var outputTexture = this.texturePool.pop();
        if(!outputTexture)outputTexture = new PIXI.FilterTexture(this.gl, this.width, this.height);
        outputTexture.resize(this.width, this.height);

        // need to clear this FBO as it may have some left over elements from a previous filter.
        gl.bindFramebuffer(gl.FRAMEBUFFER, outputTexture.frameBuffer );
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.disable(gl.BLEND);

        for (var i = 0; i < filterBlock.filterPasses.length-1; i++)
        {
            var filterPass = filterBlock.filterPasses[i];

            gl.bindFramebuffer(gl.FRAMEBUFFER, outputTexture.frameBuffer );

            // set texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, inputTexture.texture);

            // draw texture..
            //filterPass.applyFilterPass(filterArea.width, filterArea.height);
            this.applyFilterPass(filterPass, filterArea, filterArea.width, filterArea.height);

            // swap the textures..
            var temp = inputTexture;
            inputTexture = outputTexture;
            outputTexture = temp;
        }

        gl.enable(gl.BLEND);

        texture = inputTexture;
        this.texturePool.push(outputTexture);
    }

    var filter = filterBlock.filterPasses[filterBlock.filterPasses.length-1];

    this.offsetX -= filterArea.x;
    this.offsetY -= filterArea.y;


    var sizeX = this.width;
    var sizeY = this.height;

    var offsetX = 0;
    var offsetY = 0;

    var buffer = this.buffer;

    // time to render the filters texture to the previous scene
    if(this.filterStack.length === 0)
    {
        gl.colorMask(true, true, true, true);//this.transparent);
    }
    else
    {
        var currentFilter = this.filterStack[this.filterStack.length-1];
        filterArea = currentFilter._filterArea;

        sizeX = filterArea.width;
        sizeY = filterArea.height;

        offsetX = filterArea.x;
        offsetY = filterArea.y;

        buffer =  currentFilter._glFilterTexture.frameBuffer;
    }



    // TODO need toremove thease global elements..
    projection.x = sizeX/2;
    projection.y = -sizeY/2;

    offset.x = offsetX;
    offset.y = offsetY;

    filterArea = filterBlock._filterArea;

    var x = filterArea.x-offsetX;
    var y = filterArea.y-offsetY;

    // update the buffers..
    // make sure to flip the y!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

    this.vertexArray[0] = x;
    this.vertexArray[1] = y + filterArea.height;

    this.vertexArray[2] = x + filterArea.width;
    this.vertexArray[3] = y + filterArea.height;

    this.vertexArray[4] = x;
    this.vertexArray[5] = y;

    this.vertexArray[6] = x + filterArea.width;
    this.vertexArray[7] = y;

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);

    this.uvArray[2] = filterArea.width/this.width;
    this.uvArray[5] = filterArea.height/this.height;
    this.uvArray[6] = filterArea.width/this.width;
    this.uvArray[7] = filterArea.height/this.height;

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.uvArray);

   //console.log(this.vertexArray)
   //console.log(this.uvArray)
    //console.log(sizeX + " : " + sizeY)

    gl.viewport(0, 0, sizeX, sizeY);

    // bind the buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer );

    // set the blend mode! 
    //gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    // set texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture.texture);

    // apply!
    this.applyFilterPass(filter, filterArea, sizeX, sizeY);

    // now restore the regular shader..
    gl.useProgram(this.defaultShader.program);
    gl.uniform2f(this.defaultShader.projectionVector, sizeX/2, -sizeY/2);
    gl.uniform2f(this.defaultShader.offsetVector, -offsetX, -offsetY);

    // return the texture to the pool
    this.texturePool.push(texture);
    filterBlock._glFilterTexture = null;
};


/**
* Applies the filter to the specified area
* @method applyFilterPass
* @param filter {AbstractFilter} the filter that needs to be applied
* @param filterArea {texture} TODO - might need an update
* @param width {Number} the horizontal range of the filter
* @param height {Number} the vertical range of the filter
*/
PIXI.WebGLFilterManager.prototype.applyFilterPass = function(filter, filterArea, width, height)
{
    // use program
    var gl = this.gl;
    var shader = filter.shaders[gl.id];

    if(!shader)
    {
        shader = new PIXI.PixiShader(gl);

        shader.fragmentSrc = filter.fragmentSrc;
        shader.uniforms = filter.uniforms;
        shader.init();

        filter.shaders[gl.id] = shader;
    }

    // set the shader
    gl.useProgram(shader.program);

    gl.uniform2f(shader.projectionVector, width/2, -height/2);
    gl.uniform2f(shader.offsetVector, 0,0);

    if(filter.uniforms.dimensions)
    {
        filter.uniforms.dimensions.value[0] = this.width;//width;
        filter.uniforms.dimensions.value[1] = this.height;//height;
        filter.uniforms.dimensions.value[2] = this.vertexArray[0];
        filter.uniforms.dimensions.value[3] = this.vertexArray[5];//filterArea.height;
    }

  //  console.log(this.uvArray )
    shader.syncUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(shader.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.vertexAttribPointer(shader.aTextureCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.vertexAttribPointer(shader.colorAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // draw the filter...
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );

    this.renderSession.drawCount++;
};

/**
* Initialises the shader buffers
* @method initShaderBuffers
*/
PIXI.WebGLFilterManager.prototype.initShaderBuffers = function()
{
    var gl = this.gl;

    // create some buffers
    this.vertexBuffer = gl.createBuffer();
    this.uvBuffer = gl.createBuffer();
    this.colorBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();


    // bind and upload the vertexs..
    // keep a reference to the vertexFloatData..
    this.vertexArray = new Float32Array([0.0, 0.0,
                                         1.0, 0.0,
                                         0.0, 1.0,
                                         1.0, 1.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(
    gl.ARRAY_BUFFER,
    this.vertexArray,
    gl.STATIC_DRAW);


    // bind and upload the uv buffer
    this.uvArray = new Float32Array([0.0, 0.0,
                                     1.0, 0.0,
                                     0.0, 1.0,
                                     1.0, 1.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(
    gl.ARRAY_BUFFER,
    this.uvArray,
    gl.STATIC_DRAW);

    this.colorArray = new Float32Array([1.0, 0xFFFFFF,
                                        1.0, 0xFFFFFF,
                                        1.0, 0xFFFFFF,
                                        1.0, 0xFFFFFF]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(
    gl.ARRAY_BUFFER,
    this.colorArray,
    gl.STATIC_DRAW);

    // bind and upload the index
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array([0, 1, 2, 1, 3, 2]),
    gl.STATIC_DRAW);
};

/**
* Destroys the filter and removes it from the filter stack
* @method destroy
*/
PIXI.WebGLFilterManager.prototype.destroy = function()
{
    var gl = this.gl;

    this.filterStack = null;
    
    this.offsetX = 0;
    this.offsetY = 0;

    // destroy textures
    for (var i = 0; i < this.texturePool.length; i++) {
        this.texturePool.destroy();
    }
    
    this.texturePool = null;

    //destroy buffers..
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.uvBuffer);
    gl.deleteBuffer(this.colorBuffer);
    gl.deleteBuffer(this.indexBuffer);
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
* @class FilterTexture
* @constructor
* @param gl {WebGLContext} the current WebGL drawing context
* @param width {Number} the horizontal range of the filter
* @param height {Number} the vertical range of the filter
* @private
*/
PIXI.FilterTexture = function(gl, width, height)
{
    /**
     * @property gl
     * @type WebGLContext
     */
    this.gl = gl;

    // next time to create a frame buffer and texture
    this.frameBuffer = gl.createFramebuffer();
    this.texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D,  this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer );
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

    this.resize(width, height);
};


/**
* Clears the filter texture
* @method clear
*/
PIXI.FilterTexture.prototype.clear = function()
{
    var gl = this.gl;
    
    gl.clearColor(0,0,0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
};

/**
 * Resizes the texture to the specified width and height
 *
 * @method resize
 * @param width {Number} the new width of the texture
 * @param height {Number} the new height of the texture
 */
PIXI.FilterTexture.prototype.resize = function(width, height)
{
    if(this.width === width && this.height === height) return;

    this.width = width;
    this.height = height;

    var gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D,  this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

};

/**
* Destroys the filter texture
* @method destroy
*/
PIXI.FilterTexture.prototype.destroy = function()
{
    var gl = this.gl;
    gl.deleteFramebuffer( this.frameBuffer );
    gl.deleteTexture( this.texture );

    this.frameBuffer = null;
    this.texture = null;
};

/**
 * @author Mat Groves
 * 
 * 
 */
/**
 * A set of functions used to handle masking
 *
 * @class CanvasMaskManager
 */
PIXI.CanvasMaskManager = function()
{
    
};

/**
 * This method adds it to the current stack of masks
 *
 * @method pushMask
 * @param maskData the maskData that will be pushed
 * @param context {Context2D} the 2d drawing method of the canvas
 */
PIXI.CanvasMaskManager.prototype.pushMask = function(maskData, context)
{
    context.save();
    
    var cacheAlpha = maskData.alpha;
    var transform = maskData.worldTransform;

    context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);

    PIXI.CanvasGraphics.renderGraphicsMask(maskData, context);

    context.clip();

    maskData.worldAlpha = cacheAlpha;
};

/**
 * Restores the current drawing context to the state it was before the mask was applied
 *
 * @method popMask
 * @param context {Context2D} the 2d drawing method of the canvas
 */
PIXI.CanvasMaskManager.prototype.popMask = function(context)
{
    context.restore();
};

/**
 * @author Mat Groves
 * 
 * 
 */

/**
 * @class CanvasTinter
 * @constructor
 * @static
 */
PIXI.CanvasTinter = function()
{
    /// this.textureCach
};

//PIXI.CanvasTinter.cachTint = true;
    

/**
 * Basically this method just needs a sprite and a color and tints the sprite 
 * with the given color
 * 
 * @method getTintedTexture 
 * @param sprite {Sprite} the sprite to tint
 * @param color {Number} the color to use to tint the sprite with
 */
PIXI.CanvasTinter.getTintedTexture = function(sprite, color)
{

    var texture = sprite.texture;

    color = PIXI.CanvasTinter.roundColor(color);

    var stringColor = "#" + ("00000" + ( color | 0).toString(16)).substr(-6);
   
    texture.tintCache = texture.tintCache || {};

    if(texture.tintCache[stringColor]) return texture.tintCache[stringColor];

     // clone texture..
    var canvas = PIXI.CanvasTinter.canvas || document.createElement("canvas");
    
    //PIXI.CanvasTinter.tintWithPerPixel(texture, stringColor, canvas);

    
    PIXI.CanvasTinter.tintMethod(texture, color, canvas);

    if(PIXI.CanvasTinter.convertTintToImage)
    {
        // is this better?
        var tintImage = new Image();
        tintImage.src = canvas.toDataURL();

        texture.tintCache[stringColor] = tintImage;
    }
    else
    {
      
        texture.tintCache[stringColor] = canvas;
        // if we are not converting the texture to an image then we need to lose the reference to the canvas
        PIXI.CanvasTinter.canvas = null;

    }

    return canvas;
};

/**
 * Tint a texture using the "multiply" operation
 * @method tintWithMultiply
 * @param texture {texture} the texture to tint
 * @param color {Number} the color to use to tint the sprite with
 * @param canvas {HTMLCanvasElement} the current canvas
 */
PIXI.CanvasTinter.tintWithMultiply = function(texture, color, canvas)
{
    var context = canvas.getContext( "2d" );

    var frame = texture.frame;

    canvas.width = frame.width;
    canvas.height = frame.height;

    context.fillStyle = "#" + ("00000" + ( color | 0).toString(16)).substr(-6);
    
    context.fillRect(0, 0, frame.width, frame.height);
    
    context.globalCompositeOperation = "multiply";

    context.drawImage(texture.baseTexture.source,
                           frame.x,
                           frame.y,
                           frame.width,
                           frame.height,
                           0,
                           0,
                           frame.width,
                           frame.height);

    context.globalCompositeOperation = "destination-atop";
    
    context.drawImage(texture.baseTexture.source,
                           frame.x,
                           frame.y,
                           frame.width,
                           frame.height,
                           0,
                           0,
                           frame.width,
                           frame.height);
};

/**
 * Tint a texture using the "overlay" operation
 * @method tintWithOverlay
 * @param texture {texture} the texture to tint
 * @param color {Number} the color to use to tint the sprite with
 * @param canvas {HTMLCanvasElement} the current canvas
 */
PIXI.CanvasTinter.tintWithOverlay = function(texture, color, canvas)
{
    var context = canvas.getContext( "2d" );

    var frame = texture.frame;

    canvas.width = frame.width;
    canvas.height = frame.height;

    
    
    context.globalCompositeOperation = "copy";
    context.fillStyle = "#" + ("00000" + ( color | 0).toString(16)).substr(-6);
    context.fillRect(0, 0, frame.width, frame.height);

    context.globalCompositeOperation = "destination-atop";
    context.drawImage(texture.baseTexture.source,
                           frame.x,
                           frame.y,
                           frame.width,
                           frame.height,
                           0,
                           0,
                           frame.width,
                           frame.height);

    
    //context.globalCompositeOperation = "copy";

};

/**
 * Tint a texture pixel per pixel
 * @method tintPerPixel
 * @param texture {texture} the texture to tint
 * @param color {Number} the color to use to tint the sprite with
 * @param canvas {HTMLCanvasElement} the current canvas
 */
PIXI.CanvasTinter.tintWithPerPixel = function(texture, color, canvas)
{
    var context = canvas.getContext( "2d" );

    var frame = texture.frame;

    canvas.width = frame.width;
    canvas.height = frame.height;
  
    context.globalCompositeOperation = "copy";
    context.drawImage(texture.baseTexture.source,
                           frame.x,
                           frame.y,
                           frame.width,
                           frame.height,
                           0,
                           0,
                           frame.width,
                           frame.height);

    var rgbValues = PIXI.hex2rgb(color);
    var r = rgbValues[0], g = rgbValues[1], b = rgbValues[2];

    var pixelData = context.getImageData(0, 0, frame.width, frame.height);

    var pixels = pixelData.data;

    for (var i = 0; i < pixels.length; i += 4)
    {
        pixels[i+0] *= r;
        pixels[i+1] *= g;
        pixels[i+2] *= b;
    }

    context.putImageData(pixelData, 0, 0);
};

/**
 * Rounds the specified color according to the PIXI.CanvasTinter.cacheStepsPerColorChannel
 * @method roundColor
 * @param color {number} the color to round, should be a hex color
 */
PIXI.CanvasTinter.roundColor = function(color)
{
    var step = PIXI.CanvasTinter.cacheStepsPerColorChannel;

    var rgbValues = PIXI.hex2rgb(color);

    rgbValues[0] = Math.min(255, (rgbValues[0] / step) * step);
    rgbValues[1] = Math.min(255, (rgbValues[1] / step) * step);
    rgbValues[2] = Math.min(255, (rgbValues[2] / step) * step);

    return PIXI.rgb2hex(rgbValues);
};

/**
 * 
 * Number of steps which will be used as a cap when rounding colors
 *
 * @property cacheStepsPerColorChannel
 * @type Number
 */
PIXI.CanvasTinter.cacheStepsPerColorChannel = 8;
/**
 * 
 * Number of steps which will be used as a cap when rounding colors
 *
 * @property convertTintToImage
 * @type Boolean
 */
PIXI.CanvasTinter.convertTintToImage = false;

/**
 * Whether or not the Canvas BlendModes are supported, consequently the ability to tint using the multiply method
 *
 * @property canUseMultiply
 * @type Boolean
 */
PIXI.CanvasTinter.canUseMultiply = PIXI.canUseNewCanvasBlendModes();

PIXI.CanvasTinter.tintMethod = PIXI.CanvasTinter.canUseMultiply ? PIXI.CanvasTinter.tintWithMultiply :  PIXI.CanvasTinter.tintWithPerPixel;


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * the CanvasRenderer draws the stage and all its content onto a 2d canvas. This renderer should be used for browsers that do not support webGL.
 * Dont forget to add the view to your DOM or you will not see anything :)
 *
 * @class CanvasRenderer
 * @constructor
 * @param width=800 {Number} the width of the canvas view
 * @param height=600 {Number} the height of the canvas view
 * @param [view] {HTMLCanvasElement} the canvas to use as a view, optional
 * @param [transparent=false] {Boolean} the transparency of the render view, default false
 */
PIXI.CanvasRenderer = function(width, height, view, transparent)
{
    PIXI.defaultRenderer = PIXI.defaultRenderer || this;

    this.type = PIXI.CANVAS_RENDERER;

    /**
     * This sets if the CanvasRenderer will clear the canvas or not before the new render pass.
     * If the Stage is NOT transparent Pixi will use a canvas sized fillRect operation every frame to set the canvas background color.
     * If the Stage is transparent Pixi will use clearRect to clear the canvas every frame.
     * Disable this by setting this to false. For example if your game has a canvas filling background image you often don't need this set.
     *
     * @property clearBeforeRender
     * @type Boolean
     * @default
     */
    this.clearBeforeRender = true;

    /**
     * If true Pixi will Math.floor() x/y values when rendering, stopping pixel interpolation.
     * Handy for crisp pixel art and speed on legacy devices.
     *
     * @property roundPixels
     * @type Boolean
     * @default
     */
    this.roundPixels = false;

    /**
     * Whether the render view is transparent
     *
     * @property transparent
     * @type Boolean
     */
    this.transparent = !!transparent;

    if(!PIXI.blendModesCanvas)
    {
        PIXI.blendModesCanvas = [];
        
        if(PIXI.canUseNewCanvasBlendModes())
        {
            PIXI.blendModesCanvas[PIXI.blendModes.NORMAL]   = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.ADD]      = "lighter"; //IS THIS OK???
            PIXI.blendModesCanvas[PIXI.blendModes.MULTIPLY] = "multiply";
            PIXI.blendModesCanvas[PIXI.blendModes.SCREEN]   = "screen";
            PIXI.blendModesCanvas[PIXI.blendModes.OVERLAY]  = "overlay";
            PIXI.blendModesCanvas[PIXI.blendModes.DARKEN]   = "darken";
            PIXI.blendModesCanvas[PIXI.blendModes.LIGHTEN]  = "lighten";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR_DODGE] = "color-dodge";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR_BURN] = "color-burn";
            PIXI.blendModesCanvas[PIXI.blendModes.HARD_LIGHT] = "hard-light";
            PIXI.blendModesCanvas[PIXI.blendModes.SOFT_LIGHT] = "soft-light";
            PIXI.blendModesCanvas[PIXI.blendModes.DIFFERENCE] = "difference";
            PIXI.blendModesCanvas[PIXI.blendModes.EXCLUSION] = "exclusion";
            PIXI.blendModesCanvas[PIXI.blendModes.HUE]       = "hue";
            PIXI.blendModesCanvas[PIXI.blendModes.SATURATION] = "saturation";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR]      = "color";
            PIXI.blendModesCanvas[PIXI.blendModes.LUMINOSITY] = "luminosity";
        }
        else
        {
            // this means that the browser does not support the cool new blend modes in canvas "cough" ie "cough"
            PIXI.blendModesCanvas[PIXI.blendModes.NORMAL]   = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.ADD]      = "lighter"; //IS THIS OK???
            PIXI.blendModesCanvas[PIXI.blendModes.MULTIPLY] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.SCREEN]   = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.OVERLAY]  = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.DARKEN]   = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.LIGHTEN]  = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR_DODGE] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR_BURN] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.HARD_LIGHT] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.SOFT_LIGHT] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.DIFFERENCE] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.EXCLUSION] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.HUE]       = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.SATURATION] = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.COLOR]      = "source-over";
            PIXI.blendModesCanvas[PIXI.blendModes.LUMINOSITY] = "source-over";
        }
    }

    /**
     * The width of the canvas view
     *
     * @property width
     * @type Number
     * @default 800
     */
    this.width = width || 800;

    /**
     * The height of the canvas view
     *
     * @property height
     * @type Number
     * @default 600
     */
    this.height = height || 600;

    /**
     * The canvas element that everything is drawn to
     *
     * @property view
     * @type HTMLCanvasElement
     */
    this.view = view || document.createElement( "canvas" );

    /**
     * The canvas 2d context that everything is drawn with
     * @property context
     * @type HTMLCanvasElement 2d Context
     */
    this.context = this.view.getContext( "2d", { alpha: this.transparent } );

    this.refresh = true;
    // hack to enable some hardware acceleration!
    //this.view.style["transform"] = "translatez(0)";

    this.view.width = this.width;
    this.view.height = this.height;
    this.count = 0;

    /**
     * Instance of a PIXI.CanvasMaskManager, handles masking when using the canvas renderer
     * @property CanvasMaskManager
     * @type CanvasMaskManager
     */
    this.maskManager = new PIXI.CanvasMaskManager();

    /**
     * The render session is just a bunch of parameter used for rendering
     * @property renderSession
     * @type Object
     */
    this.renderSession = {
        context: this.context,
        maskManager: this.maskManager,
        scaleMode: null,
        smoothProperty: null
    };

    if("imageSmoothingEnabled" in this.context)
        this.renderSession.smoothProperty = "imageSmoothingEnabled";
    else if("webkitImageSmoothingEnabled" in this.context)
        this.renderSession.smoothProperty = "webkitImageSmoothingEnabled";
    else if("mozImageSmoothingEnabled" in this.context)
        this.renderSession.smoothProperty = "mozImageSmoothingEnabled";
    else if("oImageSmoothingEnabled" in this.context)
        this.renderSession.smoothProperty = "oImageSmoothingEnabled";
};

// constructor
PIXI.CanvasRenderer.prototype.constructor = PIXI.CanvasRenderer;

/**
 * Renders the stage to its canvas view
 *
 * @method render
 * @param stage {Stage} the Stage element to be rendered
 */
PIXI.CanvasRenderer.prototype.render = function(stage)
{
    // update textures if need be
    PIXI.texturesToUpdate.length = 0;
    PIXI.texturesToDestroy.length = 0;

    stage.updateTransform();

    this.context.setTransform(1,0,0,1,0,0);
    this.context.globalAlpha = 1;

    if (!this.transparent && this.clearBeforeRender)
    {
        this.context.fillStyle = stage.backgroundColorString;
        this.context.fillRect(0, 0, this.width, this.height);
    }
    else if (this.transparent && this.clearBeforeRender)
    {
        this.context.clearRect(0, 0, this.width, this.height);
    }

    this.renderDisplayObject(stage);

    // run interaction!
    if(stage.interactive)
    {
        //need to add some events!
        if(!stage._interactiveEventsAdded)
        {
            stage._interactiveEventsAdded = true;
            stage.interactionManager.setTarget(this);
        }
    }

    // remove frame updates..
    if(PIXI.Texture.frameUpdates.length > 0)
    {
        PIXI.Texture.frameUpdates.length = 0;
    }
};

/**
 * Resizes the canvas view to the specified width and height
 *
 * @method resize
 * @param width {Number} the new width of the canvas view
 * @param height {Number} the new height of the canvas view
 */
PIXI.CanvasRenderer.prototype.resize = function(width, height)
{
    this.width = width;
    this.height = height;

    this.view.width = width;
    this.view.height = height;
};

/**
 * Renders a display object
 *
 * @method renderDisplayObject
 * @param displayObject {DisplayObject} The displayObject to render
 * @param context {Context2D} the context 2d method of the canvas
 * @private
 */
PIXI.CanvasRenderer.prototype.renderDisplayObject = function(displayObject, context)
{
    // no longer recursive!
    //var transform;
    //var context = this.context;

    this.renderSession.context = context || this.context;
    displayObject._renderCanvas(this.renderSession);
};

/**
 * Renders a flat strip
 *
 * @method renderStripFlat
 * @param strip {Strip} The Strip to render
 * @private
 */
PIXI.CanvasRenderer.prototype.renderStripFlat = function(strip)
{
    var context = this.context;
    var verticies = strip.verticies;

    var length = verticies.length/2;
    this.count++;

    context.beginPath();
    for (var i=1; i < length-2; i++)
    {
        // draw some triangles!
        var index = i*2;

        var x0 = verticies[index],   x1 = verticies[index+2], x2 = verticies[index+4];
        var y0 = verticies[index+1], y1 = verticies[index+3], y2 = verticies[index+5];

        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.lineTo(x2, y2);
    }

    context.fillStyle = "#FF0000";
    context.fill();
    context.closePath();
};

/**
 * Renders a strip
 *
 * @method renderStrip
 * @param strip {Strip} The Strip to render
 * @private
 */
PIXI.CanvasRenderer.prototype.renderStrip = function(strip)
{
    var context = this.context;

    // draw triangles!!
    var verticies = strip.verticies;
    var uvs = strip.uvs;

    var length = verticies.length/2;
    this.count++;

    for (var i = 1; i < length-2; i++)
    {
        // draw some triangles!
        var index = i*2;

        var x0 = verticies[index],   x1 = verticies[index+2], x2 = verticies[index+4];
        var y0 = verticies[index+1], y1 = verticies[index+3], y2 = verticies[index+5];

        var u0 = uvs[index] * strip.texture.width,   u1 = uvs[index+2] * strip.texture.width, u2 = uvs[index+4]* strip.texture.width;
        var v0 = uvs[index+1]* strip.texture.height, v1 = uvs[index+3] * strip.texture.height, v2 = uvs[index+5]* strip.texture.height;

        context.save();
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.lineTo(x2, y2);
        context.closePath();

        context.clip();

        // Compute matrix transform
        var delta = u0*v1 + v0*u2 + u1*v2 - v1*u2 - v0*u1 - u0*v2;
        var deltaA = x0*v1 + v0*x2 + x1*v2 - v1*x2 - v0*x1 - x0*v2;
        var deltaB = u0*x1 + x0*u2 + u1*x2 - x1*u2 - x0*u1 - u0*x2;
        var deltaC = u0*v1*x2 + v0*x1*u2 + x0*u1*v2 - x0*v1*u2 - v0*u1*x2 - u0*x1*v2;
        var deltaD = y0*v1 + v0*y2 + y1*v2 - v1*y2 - v0*y1 - y0*v2;
        var deltaE = u0*y1 + y0*u2 + u1*y2 - y1*u2 - y0*u1 - u0*y2;
        var deltaF = u0*v1*y2 + v0*y1*u2 + y0*u1*v2 - y0*v1*u2 - v0*u1*y2 - u0*y1*v2;

        context.transform(deltaA / delta, deltaD / delta,
                            deltaB / delta, deltaE / delta,
                            deltaC / delta, deltaF / delta);

        context.drawImage(strip.texture.baseTexture.source, 0, 0);
        context.restore();
    }
};

/**
 * Creates a Canvas element of the given size
 *
 * @method CanvasBuffer
 * @param width {Number} the width for the newly created canvas
 * @param height {Number} the height for the newly created canvas
 * @static
 * @private
 */
PIXI.CanvasBuffer = function(width, height)
{
    this.width = width;
    this.height = height;

    this.canvas = document.createElement( "canvas" );
    this.context = this.canvas.getContext( "2d" );

    this.canvas.width = width;
    this.canvas.height = height;
};

/**
 * Clears the canvas that was created by the CanvasBuffer class
 *
 * @method clear
 * @private
 */
PIXI.CanvasBuffer.prototype.clear = function()
{
    this.context.clearRect(0,0, this.width, this.height);
};

/**
 * Resizes the canvas that was created by the CanvasBuffer class to the specified width and height
 *
 * @method resize
 * @param width {Number} the new width of the canvas
 * @param height {Number} the new height of the canvas
 * @private
 */

PIXI.CanvasBuffer.prototype.resize = function(width, height)
{
    this.width = this.canvas.width = width;
    this.height = this.canvas.height = height;
};


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


/**
 * A set of functions used by the canvas renderer to draw the primitive graphics data
 *
 * @class CanvasGraphics
 */
PIXI.CanvasGraphics = function()
{

};


/*
 * Renders the graphics object
 *
 * @static
 * @private
 * @method renderGraphics
 * @param graphics {Graphics} the actual graphics object to render
 * @param context {Context2D} the 2d drawing method of the canvas
 */
PIXI.CanvasGraphics.renderGraphics = function(graphics, context)
{
    var worldAlpha = graphics.worldAlpha;
    var color = '';

    for (var i = 0; i < graphics.graphicsData.length; i++)
    {
        var data = graphics.graphicsData[i];
        var points = data.points;

        context.strokeStyle = color = '#' + ('00000' + ( data.lineColor | 0).toString(16)).substr(-6);

        context.lineWidth = data.lineWidth;

        if(data.type === PIXI.Graphics.POLY)
        {
            context.beginPath();

            context.moveTo(points[0], points[1]);

            for (var j=1; j < points.length/2; j++)
            {
                context.lineTo(points[j * 2], points[j * 2 + 1]);
            }

            // if the first and last point are the same close the path - much neater :)
            if(points[0] === points[points.length-2] && points[1] === points[points.length-1])
            {
                context.closePath();
            }

            if(data.fill)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = color = '#' + ('00000' + ( data.fillColor | 0).toString(16)).substr(-6);
                context.fill();
            }
            if(data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.stroke();
            }
        }
        else if(data.type === PIXI.Graphics.RECT)
        {

            if(data.fillColor || data.fillColor === 0)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = color = '#' + ('00000' + ( data.fillColor | 0).toString(16)).substr(-6);
                context.fillRect(points[0], points[1], points[2], points[3]);

            }
            if(data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.strokeRect(points[0], points[1], points[2], points[3]);
            }

        }
        else if(data.type === PIXI.Graphics.CIRC)
        {
            // TODO - need to be Undefined!
            context.beginPath();
            context.arc(points[0], points[1], points[2],0,2*Math.PI);
            context.closePath();

            if(data.fill)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = color = '#' + ('00000' + ( data.fillColor | 0).toString(16)).substr(-6);
                context.fill();
            }
            if(data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.stroke();
            }
        }
        else if(data.type === PIXI.Graphics.ELIP)
        {

            // ellipse code taken from: http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas

            var ellipseData =  data.points;

            var w = ellipseData[2] * 2;
            var h = ellipseData[3] * 2;

            var x = ellipseData[0] - w/2;
            var y = ellipseData[1] - h/2;

            context.beginPath();

            var kappa = 0.5522848,
                ox = (w / 2) * kappa, // control point offset horizontal
                oy = (h / 2) * kappa, // control point offset vertical
                xe = x + w,           // x-end
                ye = y + h,           // y-end
                xm = x + w / 2,       // x-middle
                ym = y + h / 2;       // y-middle

            context.moveTo(x, ym);
            context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
            context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
            context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
            context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);

            context.closePath();

            if(data.fill)
            {
                context.globalAlpha = data.fillAlpha * worldAlpha;
                context.fillStyle = color = '#' + ('00000' + ( data.fillColor | 0).toString(16)).substr(-6);
                context.fill();
            }
            if(data.lineWidth)
            {
                context.globalAlpha = data.lineAlpha * worldAlpha;
                context.stroke();
            }
        }
    }
};

/*
 * Renders a graphics mask
 *
 * @static
 * @private
 * @method renderGraphicsMask
 * @param graphics {Graphics} the graphics which will be used as a mask
 * @param context {Context2D} the context 2d method of the canvas
 */
PIXI.CanvasGraphics.renderGraphicsMask = function(graphics, context)
{
    var len = graphics.graphicsData.length;

    if(len === 0) return;

    if(len > 1)
    {
        len = 1;
        window.console.log('Pixi.js warning: masks in canvas can only mask using the first path in the graphics object');
    }

    for (var i = 0; i < 1; i++)
    {
        var data = graphics.graphicsData[i];
        var points = data.points;

        if(data.type === PIXI.Graphics.POLY)
        {
            context.beginPath();
            context.moveTo(points[0], points[1]);

            for (var j=1; j < points.length/2; j++)
            {
                context.lineTo(points[j * 2], points[j * 2 + 1]);
            }

            // if the first and last point are the same close the path - much neater :)
            if(points[0] === points[points.length-2] && points[1] === points[points.length-1])
            {
                context.closePath();
            }

        }
        else if(data.type === PIXI.Graphics.RECT)
        {
            context.beginPath();
            context.rect(points[0], points[1], points[2], points[3]);
            context.closePath();
        }
        else if(data.type === PIXI.Graphics.CIRC)
        {
            // TODO - need to be Undefined!
            context.beginPath();
            context.arc(points[0], points[1], points[2],0,2*Math.PI);
            context.closePath();
        }
        else if(data.type === PIXI.Graphics.ELIP)
        {

            // ellipse code taken from: http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
            var ellipseData =  data.points;

            var w = ellipseData[2] * 2;
            var h = ellipseData[3] * 2;

            var x = ellipseData[0] - w/2;
            var y = ellipseData[1] - h/2;

            context.beginPath();

            var kappa = 0.5522848,
                ox = (w / 2) * kappa, // control point offset horizontal
                oy = (h / 2) * kappa, // control point offset vertical
                xe = x + w,           // x-end
                ye = y + h,           // y-end
                xm = x + w / 2,       // x-middle
                ym = y + h / 2;       // y-middle

            context.moveTo(x, ym);
            context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
            context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
            context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
            context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
            context.closePath();
        }
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


/**
 * The Graphics class contains a set of methods that you can use to create primitive shapes and lines.
 * It is important to know that with the webGL renderer only simple polygons can be filled at this stage
 * Complex polygons will not be filled. Heres an example of a complex polygon: http://www.goodboydigital.com/wp-content/uploads/2013/06/complexPolygon.png
 *
 * @class Graphics
 * @extends DisplayObjectContainer
 * @constructor
 */
PIXI.Graphics = function()
{
    PIXI.DisplayObjectContainer.call( this );

    this.renderable = true;

    /**
     * The alpha of the fill of this graphics object
     *
     * @property fillAlpha
     * @type Number
     */
    this.fillAlpha = 1;

    /**
     * The width of any lines drawn
     *
     * @property lineWidth
     * @type Number
     */
    this.lineWidth = 0;

    /**
     * The color of any lines drawn
     *
     * @property lineColor
     * @type String
     */
    this.lineColor = "black";

    /**
     * Graphics data
     *
     * @property graphicsData
     * @type Array
     * @private
     */
    this.graphicsData = [];


    /**
     * The tint applied to the graphic shape. This is a hex value
     *
     * @property tint
     * @type Number
     * @default 0xFFFFFF
     */
    this.tint = 0xFFFFFF;// * Math.random();
    
    /**
     * The blend mode to be applied to the graphic shape
     *
     * @property blendMode
     * @type Number
     * @default PIXI.blendModes.NORMAL;
     */
    this.blendMode = PIXI.blendModes.NORMAL;
    
    /**
     * Current path
     *
     * @property currentPath
     * @type Object
     * @private
     */
    this.currentPath = {points:[]};

    /**
     * Array containing some WebGL-related properties used by the WebGL renderer
     *
     * @property _webGL
     * @type Array
     * @private
     */
    this._webGL = [];

    /**
     * Whether this shape is being used as a mask
     *
     * @property isMask
     * @type isMask
     */
    this.isMask = false;

    /**
     * The bounds of the graphic shape as rectangle object
     *
     * @property bounds
     * @type Rectangle
     */
    this.bounds = null;

    /**
     * the bounds' padding used for bounds calculation
     *
     * @property bounds
     * @type Number
     */
    this.boundsPadding = 10;
};

// constructor
PIXI.Graphics.prototype = Object.create( PIXI.DisplayObjectContainer.prototype );
PIXI.Graphics.prototype.constructor = PIXI.Graphics;

/**
 * If cacheAsBitmap is true the graphics object will then be rendered as if it was a sprite.
 * This is useful if your graphics element does not change often as it will speed up the rendering of the object
 * It is also usful as the graphics object will always be antialiased because it will be rendered using canvas
 * Not recommended if you are constanly redrawing the graphics element.
 *
 * @property cacheAsBitmap
 * @default false
 * @type Boolean
 * @private
 */
Object.defineProperty(PIXI.Graphics.prototype, "cacheAsBitmap", {
    get: function() {
        return  this._cacheAsBitmap;
    },
    set: function(value) {
        this._cacheAsBitmap = value;

        if(this._cacheAsBitmap)
        {
            this._generateCachedSprite();
        }
        else
        {
            this.destroyCachedSprite();
            this.dirty = true;
        }

    }
});


/**
 * Specifies the line style used for subsequent calls to Graphics methods such as the lineTo() method or the drawCircle() method.
 *
 * @method lineStyle
 * @param lineWidth {Number} width of the line to draw, will update the object's stored style
 * @param color {Number} color of the line to draw, will update the object's stored style
 * @param alpha {Number} alpha of the line to draw, will update the object's stored style
 */
PIXI.Graphics.prototype.lineStyle = function(lineWidth, color, alpha)
{
    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.lineWidth = lineWidth || 0;
    this.lineColor = color || 0;
    this.lineAlpha = (arguments.length < 3) ? 1 : alpha;

    this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling, points:[], type:PIXI.Graphics.POLY};

    this.graphicsData.push(this.currentPath);

    return this;
};

/**
 * Moves the current drawing position to (x, y).
 *
 * @method moveTo
 * @param x {Number} the X coordinate to move to
 * @param y {Number} the Y coordinate to move to
 */
PIXI.Graphics.prototype.moveTo = function(x, y)
{
    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.currentPath = this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling, points:[], type:PIXI.Graphics.POLY};

    this.currentPath.points.push(x, y);

    this.graphicsData.push(this.currentPath);

    return this;
};

/**
 * Draws a line using the current line style from the current drawing position to (x, y);
 * the current drawing position is then set to (x, y).
 *
 * @method lineTo
 * @param x {Number} the X coordinate to draw to
 * @param y {Number} the Y coordinate to draw to
 */
PIXI.Graphics.prototype.lineTo = function(x, y)
{
    this.currentPath.points.push(x, y);
    this.dirty = true;

    return this;
};

/**
 * Specifies a simple one-color fill that subsequent calls to other Graphics methods
 * (such as lineTo() or drawCircle()) use when drawing.
 *
 * @method beginFill
 * @param color {Number} the color of the fill
 * @param alpha {Number} the alpha of the fill
 */
PIXI.Graphics.prototype.beginFill = function(color, alpha)
{

    this.filling = true;
    this.fillColor = color || 0;
    this.fillAlpha = (arguments.length < 2) ? 1 : alpha;

    return this;
};

/**
 * Applies a fill to the lines and shapes that were added since the last call to the beginFill() method.
 *
 * @method endFill
 */
PIXI.Graphics.prototype.endFill = function()
{
    this.filling = false;
    this.fillColor = null;
    this.fillAlpha = 1;

    return this;
};

/**
 * @method drawRect
 *
 * @param x {Number} The X coord of the top-left of the rectangle
 * @param y {Number} The Y coord of the top-left of the rectangle
 * @param width {Number} The width of the rectangle
 * @param height {Number} The height of the rectangle
 */
PIXI.Graphics.prototype.drawRect = function( x, y, width, height )
{
    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling,
                        points:[x, y, width, height], type:PIXI.Graphics.RECT};

    this.graphicsData.push(this.currentPath);
    this.dirty = true;

    return this;
};

/**
 * Draws a circle.
 *
 * @method drawCircle
 * @param x {Number} The X coordinate of the center of the circle
 * @param y {Number} The Y coordinate of the center of the circle
 * @param radius {Number} The radius of the circle
 */
PIXI.Graphics.prototype.drawCircle = function( x, y, radius)
{

    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling,
                        points:[x, y, radius, radius], type:PIXI.Graphics.CIRC};

    this.graphicsData.push(this.currentPath);
    this.dirty = true;

    return this;
};

/**
 * Draws an ellipse.
 *
 * @method drawEllipse
 * @param x {Number} The X coordinate of the upper-left corner of the framing rectangle of this ellipse
 * @param y {Number} The Y coordinate of the upper-left corner of the framing rectangle of this ellipse
 * @param width {Number} The width of the ellipse
 * @param height {Number} The height of the ellipse
 */
PIXI.Graphics.prototype.drawEllipse = function( x, y, width, height)
{

    if (!this.currentPath.points.length) this.graphicsData.pop();

    this.currentPath = {lineWidth:this.lineWidth, lineColor:this.lineColor, lineAlpha:this.lineAlpha,
                        fillColor:this.fillColor, fillAlpha:this.fillAlpha, fill:this.filling,
                        points:[x, y, width, height], type:PIXI.Graphics.ELIP};

    this.graphicsData.push(this.currentPath);
    this.dirty = true;

    return this;
};

/**
 * Clears the graphics that were drawn to this Graphics object, and resets fill and line style settings.
 *
 * @method clear
 */
PIXI.Graphics.prototype.clear = function()
{
    this.lineWidth = 0;
    this.filling = false;

    this.dirty = true;
    this.clearDirty = true;
    this.graphicsData = [];

    this.bounds = null; //new PIXI.Rectangle();

    return this;
};

/**
 * Useful function that returns a texture of the graphics object that can then be used to create sprites
 * This can be quite useful if your geometry is complicated and needs to be reused multiple times.
 *
 * @method generateTexture
 * @return {Texture} a texture of the graphics object
 */
PIXI.Graphics.prototype.generateTexture = function()
{
    var bounds = this.getBounds();

    var canvasBuffer = new PIXI.CanvasBuffer(bounds.width, bounds.height);
    var texture = PIXI.Texture.fromCanvas(canvasBuffer.canvas);

    canvasBuffer.context.translate(-bounds.x,-bounds.y);
    
    PIXI.CanvasGraphics.renderGraphics(this, canvasBuffer.context);

    return texture;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.Graphics.prototype._renderWebGL = function(renderSession)
{
    // if the sprite is not visible or the alpha is 0 then no need to render this element
    if(this.visible === false || this.alpha === 0 || this.isMask === true)return;
    
    if(this._cacheAsBitmap)
    {
       
        if(this.dirty)
        {
            this._generateCachedSprite();
            // we will also need to update the texture on the gpu too!
            PIXI.updateWebGLTexture(this._cachedSprite.texture.baseTexture, renderSession.gl);
            
            this.dirty =  false;
        }

        this._cachedSprite.alpha = this.alpha;
        PIXI.Sprite.prototype._renderWebGL.call(this._cachedSprite, renderSession);

        return;
    }
    else
    {
        renderSession.spriteBatch.stop();

        if(this._mask)renderSession.maskManager.pushMask(this.mask, renderSession);
        if(this._filters)renderSession.filterManager.pushFilter(this._filterBlock);
      
        // check blend mode
        if(this.blendMode !== renderSession.spriteBatch.currentBlendMode)
        {
            renderSession.spriteBatch.currentBlendMode = this.blendMode;
            var blendModeWebGL = PIXI.blendModesWebGL[renderSession.spriteBatch.currentBlendMode];
            renderSession.spriteBatch.gl.blendFunc(blendModeWebGL[0], blendModeWebGL[1]);
        }
     
        PIXI.WebGLGraphics.renderGraphics(this, renderSession);
        
        // only render if it has children!
        if(this.children.length)
        {
            renderSession.spriteBatch.start();

             // simple render children!
            for(var i=0, j=this.children.length; i<j; i++)
            {
                this.children[i]._renderWebGL(renderSession);
            }

            renderSession.spriteBatch.stop();
        }

        if(this._filters)renderSession.filterManager.popFilter();
        if(this._mask)renderSession.maskManager.popMask(renderSession);
          
        renderSession.drawCount++;

        renderSession.spriteBatch.start();
    }
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.Graphics.prototype._renderCanvas = function(renderSession)
{
    // if the sprite is not visible or the alpha is 0 then no need to render this element
    if(this.visible === false || this.alpha === 0 || this.isMask === true)return;
    
    var context = renderSession.context;
    var transform = this.worldTransform;
    
    if(this.blendMode !== renderSession.currentBlendMode)
    {
        renderSession.currentBlendMode = this.blendMode;
        context.globalCompositeOperation = PIXI.blendModesCanvas[renderSession.currentBlendMode];
    }

    context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx, transform.ty);
    PIXI.CanvasGraphics.renderGraphics(this, context);

     // simple render children!
    for(var i=0, j=this.children.length; i<j; i++)
    {
        this.children[i]._renderCanvas(renderSession);
    }
};

/**
 * Retrieves the bounds of the graphic shape as a rectangle object
 *
 * @method getBounds
 * @return {Rectangle} the rectangular bounding area
 */
PIXI.Graphics.prototype.getBounds = function( matrix )
{
    if(!this.bounds)this.updateBounds();

    var w0 = this.bounds.x;
    var w1 = this.bounds.width + this.bounds.x;

    var h0 = this.bounds.y;
    var h1 = this.bounds.height + this.bounds.y;

    var worldTransform = matrix || this.worldTransform;

    var a = worldTransform.a;
    var b = worldTransform.c;
    var c = worldTransform.b;
    var d = worldTransform.d;
    var tx = worldTransform.tx;
    var ty = worldTransform.ty;

    var x1 = a * w1 + c * h1 + tx;
    var y1 = d * h1 + b * w1 + ty;

    var x2 = a * w0 + c * h1 + tx;
    var y2 = d * h1 + b * w0 + ty;

    var x3 = a * w0 + c * h0 + tx;
    var y3 = d * h0 + b * w0 + ty;

    var x4 =  a * w1 + c * h0 + tx;
    var y4 =  d * h0 + b * w1 + ty;

    var maxX = -Infinity;
    var maxY = -Infinity;

    var minX = Infinity;
    var minY = Infinity;

    minX = x1 < minX ? x1 : minX;
    minX = x2 < minX ? x2 : minX;
    minX = x3 < minX ? x3 : minX;
    minX = x4 < minX ? x4 : minX;

    minY = y1 < minY ? y1 : minY;
    minY = y2 < minY ? y2 : minY;
    minY = y3 < minY ? y3 : minY;
    minY = y4 < minY ? y4 : minY;

    maxX = x1 > maxX ? x1 : maxX;
    maxX = x2 > maxX ? x2 : maxX;
    maxX = x3 > maxX ? x3 : maxX;
    maxX = x4 > maxX ? x4 : maxX;

    maxY = y1 > maxY ? y1 : maxY;
    maxY = y2 > maxY ? y2 : maxY;
    maxY = y3 > maxY ? y3 : maxY;
    maxY = y4 > maxY ? y4 : maxY;

    var bounds = this._bounds;

    bounds.x = minX;
    bounds.width = maxX - minX;

    bounds.y = minY;
    bounds.height = maxY - minY;

    return bounds;
};

/**
 * Update the bounds of the object
 *
 * @method updateBounds
 */
PIXI.Graphics.prototype.updateBounds = function()
{
    
    var minX = Infinity;
    var maxX = -Infinity;

    var minY = Infinity;
    var maxY = -Infinity;

    var points, x, y, w, h;

    for (var i = 0; i < this.graphicsData.length; i++) {
        var data = this.graphicsData[i];
        var type = data.type;
        var lineWidth = data.lineWidth;

        points = data.points;

        if(type === PIXI.Graphics.RECT)
        {
            x = points[0] - lineWidth/2;
            y = points[1] - lineWidth/2;
            w = points[2] + lineWidth;
            h = points[3] + lineWidth;

            minX = x < minX ? x : minX;
            maxX = x + w > maxX ? x + w : maxX;

            minY = y < minY ? x : minY;
            maxY = y + h > maxY ? y + h : maxY;
        }
        else if(type === PIXI.Graphics.CIRC || type === PIXI.Graphics.ELIP)
        {
            x = points[0];
            y = points[1];
            w = points[2] + lineWidth/2;
            h = points[3] + lineWidth/2;

            minX = x - w < minX ? x - w : minX;
            maxX = x + w > maxX ? x + w : maxX;

            minY = y - h < minY ? y - h : minY;
            maxY = y + h > maxY ? y + h : maxY;
        }
        else
        {
            // POLY
            for (var j = 0; j < points.length; j+=2)
            {

                x = points[j];
                y = points[j+1];
                minX = x-lineWidth < minX ? x-lineWidth : minX;
                maxX = x+lineWidth > maxX ? x+lineWidth : maxX;

                minY = y-lineWidth < minY ? y-lineWidth : minY;
                maxY = y+lineWidth > maxY ? y+lineWidth : maxY;
            }
        }
    }

    var padding = this.boundsPadding;
    this.bounds = new PIXI.Rectangle(minX - padding, minY - padding, (maxX - minX) + padding * 2, (maxY - minY) + padding * 2);
};


/**
 * Generates the cached sprite when the sprite has cacheAsBitmap = true
 *
 * @method _generateCachedSprite
 * @private
 */
PIXI.Graphics.prototype._generateCachedSprite = function()
{
    var bounds = this.getLocalBounds();

    if(!this._cachedSprite)
    {
        var canvasBuffer = new PIXI.CanvasBuffer(bounds.width, bounds.height);
        var texture = PIXI.Texture.fromCanvas(canvasBuffer.canvas);
        
        this._cachedSprite = new PIXI.Sprite(texture);
        this._cachedSprite.buffer = canvasBuffer;

        this._cachedSprite.worldTransform = this.worldTransform;
    }
    else
    {
        this._cachedSprite.buffer.resize(bounds.width, bounds.height);
    }

    // leverage the anchor to account for the offset of the element
    this._cachedSprite.anchor.x = -( bounds.x / bounds.width );
    this._cachedSprite.anchor.y = -( bounds.y / bounds.height );

   // this._cachedSprite.buffer.context.save();
    this._cachedSprite.buffer.context.translate(-bounds.x,-bounds.y);
    
    PIXI.CanvasGraphics.renderGraphics(this, this._cachedSprite.buffer.context);
    this._cachedSprite.alpha = this.alpha;

   // this._cachedSprite.buffer.context.restore();
};

PIXI.Graphics.prototype.destroyCachedSprite = function()
{
    this._cachedSprite.texture.destroy(true);

    // let the gc collect the unused sprite
    // TODO could be object pooled!
    this._cachedSprite = null;
};


// SOME TYPES:
PIXI.Graphics.POLY = 0;
PIXI.Graphics.RECT = 1;
PIXI.Graphics.CIRC = 2;
PIXI.Graphics.ELIP = 3;

/**
 * @author Mat Groves http://matgroves.com/
 */

 /**
 * 
 * @class Strip
 * @extends DisplayObjectContainer
 * @constructor
 * @param texture {Texture} The texture to use
 * @param width {Number} the width 
 * @param height {Number} the height
 * 
 */
PIXI.Strip = function(texture, width, height)
{
    PIXI.DisplayObjectContainer.call( this );
    this.texture = texture;
    this.blendMode = PIXI.blendModes.NORMAL;

    try
    {
        this.uvs = new Float32Array([0, 1,
                1, 1,
                1, 0, 0,1]);

        this.verticies = new Float32Array([0, 0,
                          0,0,
                          0,0, 0,
                          0, 0]);

        this.colors = new Float32Array([1, 1, 1, 1]);

        this.indices = new Uint16Array([0, 1, 2, 3]);
    }
    catch(error)
    {
        this.uvs = [0, 1,
                1, 1,
                1, 0, 0,1];

        this.verticies = [0, 0,
                          0,0,
                          0,0, 0,
                          0, 0];

        this.colors = [1, 1, 1, 1];

        this.indices = [0, 1, 2, 3];
    }


    /*
    this.uvs = new Float32Array()
    this.verticies = new Float32Array()
    this.colors = new Float32Array()
    this.indices = new Uint16Array()
    */
    
    this.width = width;
    this.height = height;

    // load the texture!
    if(texture.baseTexture.hasLoaded)
    {
        this.width   = this.texture.frame.width;
        this.height  = this.texture.frame.height;
        this.updateFrame = true;
    }
    else
    {
        this.onTextureUpdateBind = this.onTextureUpdate.bind(this);
        this.texture.addEventListener( 'update', this.onTextureUpdateBind );
    }

    this.renderable = true;
};

// constructor
PIXI.Strip.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
PIXI.Strip.prototype.constructor = PIXI.Strip;

/*
 * Sets the texture that the Strip will use 
 *
 * @method setTexture
 * @param texture {Texture} the texture that will be used
 * @private
 */
PIXI.Strip.prototype.setTexture = function(texture)
{
    //TODO SET THE TEXTURES
    //TODO VISIBILITY

    // stop current texture
    this.texture = texture;
    this.width   = texture.frame.width;
    this.height  = texture.frame.height;
    this.updateFrame = true;
};

/**
 * When the texture is updated, this event will fire to update the scale and frame
 *
 * @method onTextureUpdate
 * @param event
 * @private
 */
PIXI.Strip.prototype.onTextureUpdate = function()
{
    this.updateFrame = true;
};
/* @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * 
 * @class Rope
 * @constructor
 * @param texture {Texture} The texture to use
 * @param points {Array}
 * 
 */
PIXI.Rope = function(texture, points)
{
    PIXI.Strip.call( this, texture );
    this.points = points;

    try
    {
        this.verticies = new Float32Array(points.length * 4);
        this.uvs = new Float32Array(points.length * 4);
        this.colors = new Float32Array(points.length * 2);
        this.indices = new Uint16Array(points.length * 2);
    }
    catch(error)
    {
        this.verticies = new Array(points.length * 4);
        this.uvs = new Array(points.length * 4);
        this.colors = new Array(points.length * 2);
        this.indices = new Array(points.length * 2);
    }

    this.refresh();
};


// constructor
PIXI.Rope.prototype = Object.create( PIXI.Strip.prototype );
PIXI.Rope.prototype.constructor = PIXI.Rope;

/*
 * Refreshes 
 *
 * @method refresh
 */
PIXI.Rope.prototype.refresh = function()
{
    var points = this.points;
    if(points.length < 1) return;

    var uvs = this.uvs;

    var lastPoint = points[0];
    var indices = this.indices;
    var colors = this.colors;

    this.count-=0.2;


    uvs[0] = 0;
    uvs[1] = 1;
    uvs[2] = 0;
    uvs[3] = 1;

    colors[0] = 1;
    colors[1] = 1;

    indices[0] = 0;
    indices[1] = 1;

    var total = points.length,
        point, index, amount;

    for (var i = 1; i < total; i++)
    {

        point = points[i];
        index = i * 4;
        // time to do some smart drawing!
        amount = i / (total-1);

        if(i%2)
        {
            uvs[index] = amount;
            uvs[index+1] = 0;

            uvs[index+2] = amount;
            uvs[index+3] = 1;

        }
        else
        {
            uvs[index] = amount;
            uvs[index+1] = 0;

            uvs[index+2] = amount;
            uvs[index+3] = 1;
        }

        index = i * 2;
        colors[index] = 1;
        colors[index+1] = 1;

        index = i * 2;
        indices[index] = index;
        indices[index + 1] = index + 1;

        lastPoint = point;
    }
};

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.Rope.prototype.updateTransform = function()
{

    var points = this.points;
    if(points.length < 1)return;

    var lastPoint = points[0];
    var nextPoint;
    var perp = {x:0, y:0};

    this.count-=0.2;

    var verticies = this.verticies;
    verticies[0] = lastPoint.x + perp.x;
    verticies[1] = lastPoint.y + perp.y; //+ 200
    verticies[2] = lastPoint.x - perp.x;
    verticies[3] = lastPoint.y - perp.y;//+200
    // time to do some smart drawing!

    var total = points.length,
        point, index, ratio, perpLength, num;

    for (var i = 1; i < total; i++)
    {
        point = points[i];
        index = i * 4;

        if(i < points.length-1)
        {
            nextPoint = points[i+1];
        }
        else
        {
            nextPoint = point;
        }

        perp.y = -(nextPoint.x - lastPoint.x);
        perp.x = nextPoint.y - lastPoint.y;

        ratio = (1 - (i / (total-1))) * 10;

        if(ratio > 1) ratio = 1;

        perpLength = Math.sqrt(perp.x * perp.x + perp.y * perp.y);
        num = this.texture.height / 2; //(20 + Math.abs(Math.sin((i + this.count) * 0.3) * 50) )* ratio;
        perp.x /= perpLength;
        perp.y /= perpLength;

        perp.x *= num;
        perp.y *= num;

        verticies[index] = point.x + perp.x;
        verticies[index+1] = point.y + perp.y;
        verticies[index+2] = point.x - perp.x;
        verticies[index+3] = point.y - perp.y;

        lastPoint = point;
    }

    PIXI.DisplayObjectContainer.prototype.updateTransform.call( this );
};
/*
 * Sets the texture that the Rope will use 
 *
 * @method setTexture
 * @param texture {Texture} the texture that will be used
 */
PIXI.Rope.prototype.setTexture = function(texture)
{
    // stop current texture
    this.texture = texture;
    this.updateFrame = true;
};

/**
 * @author Mat Groves http://matgroves.com/
 */

/**
 * A tiling sprite is a fast way of rendering a tiling image
 *
 * @class TilingSprite
 * @extends Sprite
 * @constructor
 * @param texture {Texture} the texture of the tiling sprite
 * @param width {Number}  the width of the tiling sprite
 * @param height {Number} the height of the tiling sprite
 */
PIXI.TilingSprite = function(texture, width, height)
{
    PIXI.Sprite.call( this, texture);

    /**
     * The with of the tiling sprite
     *
     * @property width
     * @type Number
     */
    this.width = width || 100;

    /**
     * The height of the tiling sprite
     *
     * @property height
     * @type Number
     */
    this.height = height || 100;

    /**
     * The scaling of the image that is being tiled
     *
     * @property tileScale
     * @type Point
     */
    this.tileScale = new PIXI.Point(1,1);

    /**
     * A point that represents the scale of the texture object
     *
     * @property tileScaleOffset
     * @type Point
     */
    this.tileScaleOffset = new PIXI.Point(1,1);
    
    /**
     * The offset position of the image that is being tiled
     *
     * @property tilePosition
     * @type Point
     */
    this.tilePosition = new PIXI.Point(0,0);


    /**
     * Whether this sprite is renderable or not
     *
     * @property renderable
     * @type Boolean
     * @default true
     */
    this.renderable = true;

    /**
     * The tint applied to the sprite. This is a hex value
     *
     * @property tint
     * @type Number
     * @default 0xFFFFFF
     */
    this.tint = 0xFFFFFF;
    
    /**
     * The blend mode to be applied to the sprite
     *
     * @property blendMode
     * @type Number
     * @default PIXI.blendModes.NORMAL;
     */
    this.blendMode = PIXI.blendModes.NORMAL;
};

// constructor
PIXI.TilingSprite.prototype = Object.create(PIXI.Sprite.prototype);
PIXI.TilingSprite.prototype.constructor = PIXI.TilingSprite;


/**
 * The width of the sprite, setting this will actually modify the scale to achieve the value set
 *
 * @property width
 * @type Number
 */
Object.defineProperty(PIXI.TilingSprite.prototype, 'width', {
    get: function() {
        return this._width;
    },
    set: function(value) {
        
        this._width = value;
    }
});

/**
 * The height of the TilingSprite, setting this will actually modify the scale to achieve the value set
 *
 * @property height
 * @type Number
 */
Object.defineProperty(PIXI.TilingSprite.prototype, 'height', {
    get: function() {
        return  this._height;
    },
    set: function(value) {
        this._height = value;
    }
});

/**
 * When the texture is updated, this event will be fired to update the scale and frame
 *
 * @method onTextureUpdate
 * @param event
 * @private
 */
PIXI.TilingSprite.prototype.onTextureUpdate = function()
{
    this.updateFrame = true;
};

PIXI.TilingSprite.prototype.setTexture = function(texture)
{
    if(this.texture === texture)return;

    this.texture = texture;

    this.refreshTexture = true;
    /*
    if(this.tilingTexture)
    {
        this.generateTilingTexture(true);
    }
*/

    /*
    // stop current texture;
    if(this.texture.baseTexture !== texture.baseTexture)
    {
        this.textureChange = true;
        this.texture = texture;
    }
    else
    {
        this.texture = texture;
    }

    this.updateFrame = true;*/
    this.cachedTint = 0xFFFFFF;
};

/**
* Renders the object using the WebGL renderer
*
* @method _renderWebGL
* @param renderSession {RenderSession} 
* @private
*/
PIXI.TilingSprite.prototype._renderWebGL = function(renderSession)
{

    if(this.visible === false || this.alpha === 0)return;
    
    var i,j;

    if(this.mask)
    {
        renderSession.spriteBatch.stop();
        renderSession.maskManager.pushMask(this.mask, renderSession);
        renderSession.spriteBatch.start();
    }

    if(this.filters)
    {
        renderSession.spriteBatch.flush();
        renderSession.filterManager.pushFilter(this._filterBlock);
    }


    if(!this.tilingTexture || this.refreshTexture)
    {
        this.generateTilingTexture(true);
        if(this.tilingTexture && this.tilingTexture.needsUpdate)
        {
            //TODO - tweaking
            PIXI.updateWebGLTexture(this.tilingTexture.baseTexture, renderSession.gl);
            this.tilingTexture.needsUpdate = false;
           // this.tilingTexture._uvs = null;
        }
    }
    else renderSession.spriteBatch.renderTilingSprite(this);
    

    // simple render children!
    for(i=0,j=this.children.length; i<j; i++)
    {
        this.children[i]._renderWebGL(renderSession);
    }

    renderSession.spriteBatch.stop();

    if(this.filters)renderSession.filterManager.popFilter();
    if(this.mask)renderSession.maskManager.popMask(renderSession);
    
    renderSession.spriteBatch.start();
};

/**
* Renders the object using the Canvas renderer
*
* @method _renderCanvas
* @param renderSession {RenderSession} 
* @private
*/
PIXI.TilingSprite.prototype._renderCanvas = function(renderSession)
{
    if(this.visible === false || this.alpha === 0)return;
    
    var context = renderSession.context;

    if(this._mask)
    {
        renderSession.maskManager.pushMask(this._mask, context);
    }

    context.globalAlpha = this.worldAlpha;

    
    var transform = this.worldTransform;

    // allow for trimming
//(this.anchor.x) * -frame.width,
//                               (this.anchor.y) * -frame.height,

         
    context.setTransform(transform.a, transform.c, transform.b, transform.d, transform.tx , transform.ty);


    if(!this.__tilePattern ||  this.refreshTexture)
    {
        this.generateTilingTexture(false);
    
        if(this.tilingTexture)
        {
            this.__tilePattern = context.createPattern(this.tilingTexture.baseTexture.source, 'repeat');
        }
        else
        {
            return;
        }
    }

    // check blend mode
    if(this.blendMode !== renderSession.currentBlendMode)
    {
        renderSession.currentBlendMode = this.blendMode;
        context.globalCompositeOperation = PIXI.blendModesCanvas[renderSession.currentBlendMode];
    }

    context.beginPath();

    var tilePosition = this.tilePosition;
    var tileScale = this.tileScale;

    tilePosition.x %= this.tilingTexture.baseTexture.width;
    tilePosition.y %= this.tilingTexture.baseTexture.height;

    // offset
    context.scale(tileScale.x,tileScale.y);
    context.translate(tilePosition.x, tilePosition.y);

    context.fillStyle = this.__tilePattern;

    // make sure to account for the anchor point..
    context.fillRect(-tilePosition.x + (this.anchor.x * -this._width),-tilePosition.y + (this.anchor.y * -this._height),
                        this._width / tileScale.x, this._height / tileScale.y);

    context.scale(1/tileScale.x, 1/tileScale.y);
    context.translate(-tilePosition.x, -tilePosition.y);

    context.closePath();

    if(this._mask)
    {
        renderSession.maskManager.popMask(renderSession.context);
    }
};


/**
* Returns the framing rectangle of the sprite as a PIXI.Rectangle object
*
* @method getBounds
* @return {Rectangle} the framing rectangle
*/
PIXI.TilingSprite.prototype.getBounds = function()
{

    var width = this._width;
    var height = this._height;

    var w0 = width * (1-this.anchor.x);
    var w1 = width * -this.anchor.x;

    var h0 = height * (1-this.anchor.y);
    var h1 = height * -this.anchor.y;

    var worldTransform = this.worldTransform;

    var a = worldTransform.a;
    var b = worldTransform.c;
    var c = worldTransform.b;
    var d = worldTransform.d;
    var tx = worldTransform.tx;
    var ty = worldTransform.ty;
    
    var x1 = a * w1 + c * h1 + tx;
    var y1 = d * h1 + b * w1 + ty;

    var x2 = a * w0 + c * h1 + tx;
    var y2 = d * h1 + b * w0 + ty;

    var x3 = a * w0 + c * h0 + tx;
    var y3 = d * h0 + b * w0 + ty;

    var x4 =  a * w1 + c * h0 + tx;
    var y4 =  d * h0 + b * w1 + ty;

    var maxX = -Infinity;
    var maxY = -Infinity;

    var minX = Infinity;
    var minY = Infinity;

    minX = x1 < minX ? x1 : minX;
    minX = x2 < minX ? x2 : minX;
    minX = x3 < minX ? x3 : minX;
    minX = x4 < minX ? x4 : minX;

    minY = y1 < minY ? y1 : minY;
    minY = y2 < minY ? y2 : minY;
    minY = y3 < minY ? y3 : minY;
    minY = y4 < minY ? y4 : minY;

    maxX = x1 > maxX ? x1 : maxX;
    maxX = x2 > maxX ? x2 : maxX;
    maxX = x3 > maxX ? x3 : maxX;
    maxX = x4 > maxX ? x4 : maxX;

    maxY = y1 > maxY ? y1 : maxY;
    maxY = y2 > maxY ? y2 : maxY;
    maxY = y3 > maxY ? y3 : maxY;
    maxY = y4 > maxY ? y4 : maxY;

    var bounds = this._bounds;

    bounds.x = minX;
    bounds.width = maxX - minX;

    bounds.y = minY;
    bounds.height = maxY - minY;

    // store a reference so that if this function gets called again in the render cycle we do not have to recalculate
    this._currentBounds = bounds;

    return bounds;
};

/**
* 
* @method generateTilingTexture
* 
* @param forcePowerOfTwo {Boolean} Whether we want to force the texture to be a power of two
*/
PIXI.TilingSprite.prototype.generateTilingTexture = function(forcePowerOfTwo)
{
    var texture = this.texture;

    if(!texture.baseTexture.hasLoaded)return;

    var baseTexture = texture.baseTexture;
    var frame = texture.frame;

    var targetWidth, targetHeight;

    // check that the frame is the same size as the base texture.
    var isFrame = frame.width !== baseTexture.width || frame.height !== baseTexture.height;

    var newTextureRequired = false;

    if(!forcePowerOfTwo)
    {
        if(isFrame)
        {
            targetWidth = frame.width;
            targetHeight = frame.height;
           
            newTextureRequired = true;
            
        }
    }
    else
    {
        targetWidth = PIXI.getNextPowerOfTwo(frame.width);
        targetHeight = PIXI.getNextPowerOfTwo(frame.height);
        if(frame.width !== targetWidth && frame.height !== targetHeight)newTextureRequired = true;
    }

    if(newTextureRequired)
    {
        var canvasBuffer;

        if(this.tilingTexture && this.tilingTexture.isTiling)
        {
            canvasBuffer = this.tilingTexture.canvasBuffer;
            canvasBuffer.resize(targetWidth, targetHeight);
            this.tilingTexture.baseTexture.width = targetWidth;
            this.tilingTexture.baseTexture.height = targetHeight;
            this.tilingTexture.needsUpdate = true;
        }
        else
        {
            canvasBuffer = new PIXI.CanvasBuffer(targetWidth, targetHeight);

            this.tilingTexture = PIXI.Texture.fromCanvas(canvasBuffer.canvas);
            this.tilingTexture.canvasBuffer = canvasBuffer;
            this.tilingTexture.isTiling = true;

        }
        
        canvasBuffer.context.drawImage(texture.baseTexture.source,
                                           frame.x,
                                           frame.y,
                                           frame.width,
                                           frame.height,
                                           0,
                                           0,
                                           targetWidth,
                                           targetHeight);

        this.tileScaleOffset.x = frame.width / targetWidth;
        this.tileScaleOffset.y = frame.height / targetHeight;

    }
    else
    {
        //TODO - switching?
        if(this.tilingTexture && this.tilingTexture.isTiling)
        {
            // destroy the tiling texture!
            // TODO could store this somewhere?
            this.tilingTexture.destroy(true);
        }

        this.tileScaleOffset.x = 1;
        this.tileScaleOffset.y = 1;
        this.tilingTexture = texture;
    }
    this.refreshTexture = false;
    this.tilingTexture.baseTexture._powerOf2 = true;
};
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * based on pixi impact spine implementation made by Eemeli Kelokorpi (@ekelokorpi) https://github.com/ekelokorpi
 *
 * Awesome JS run time provided by EsotericSoftware
 * https://github.com/EsotericSoftware/spine-runtimes
 *
 */

/*
 * Awesome JS run time provided by EsotericSoftware
 *
 * https://github.com/EsotericSoftware/spine-runtimes
 *
 */



var spine = {};

spine.BoneData = function (name, parent) {
    this.name = name;
    this.parent = parent;
};
spine.BoneData.prototype = {
    length: 0,
    x: 0, y: 0,
    rotation: 0,
    scaleX: 1, scaleY: 1
};

spine.SlotData = function (name, boneData) {
    this.name = name;
    this.boneData = boneData;
};
spine.SlotData.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    attachmentName: null
};

spine.Bone = function (boneData, parent) {
    this.data = boneData;
    this.parent = parent;
    this.setToSetupPose();
};
spine.Bone.yDown = false;
spine.Bone.prototype = {
    x: 0, y: 0,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    m00: 0, m01: 0, worldX: 0, // a b x
    m10: 0, m11: 0, worldY: 0, // c d y
    worldRotation: 0,
    worldScaleX: 1, worldScaleY: 1,
    updateWorldTransform: function (flipX, flipY) {
        var parent = this.parent;
        if (parent != null) {
            this.worldX = this.x * parent.m00 + this.y * parent.m01 + parent.worldX;
            this.worldY = this.x * parent.m10 + this.y * parent.m11 + parent.worldY;
            this.worldScaleX = parent.worldScaleX * this.scaleX;
            this.worldScaleY = parent.worldScaleY * this.scaleY;
            this.worldRotation = parent.worldRotation + this.rotation;
        } else {
            this.worldX = this.x;
            this.worldY = this.y;
            this.worldScaleX = this.scaleX;
            this.worldScaleY = this.scaleY;
            this.worldRotation = this.rotation;
        }
        var radians = this.worldRotation * Math.PI / 180;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        this.m00 = cos * this.worldScaleX;
        this.m10 = sin * this.worldScaleX;
        this.m01 = -sin * this.worldScaleY;
        this.m11 = cos * this.worldScaleY;
        if (flipX) {
            this.m00 = -this.m00;
            this.m01 = -this.m01;
        }
        if (flipY) {
            this.m10 = -this.m10;
            this.m11 = -this.m11;
        }
        if (spine.Bone.yDown) {
            this.m10 = -this.m10;
            this.m11 = -this.m11;
        }
    },
    setToSetupPose: function () {
        var data = this.data;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation;
        this.scaleX = data.scaleX;
        this.scaleY = data.scaleY;
    }
};

spine.Slot = function (slotData, skeleton, bone) {
    this.data = slotData;
    this.skeleton = skeleton;
    this.bone = bone;
    this.setToSetupPose();
};
spine.Slot.prototype = {
    r: 1, g: 1, b: 1, a: 1,
    _attachmentTime: 0,
    attachment: null,
    setAttachment: function (attachment) {
        this.attachment = attachment;
        this._attachmentTime = this.skeleton.time;
    },
    setAttachmentTime: function (time) {
        this._attachmentTime = this.skeleton.time - time;
    },
    getAttachmentTime: function () {
        return this.skeleton.time - this._attachmentTime;
    },
    setToSetupPose: function () {
        var data = this.data;
        this.r = data.r;
        this.g = data.g;
        this.b = data.b;
        this.a = data.a;

        var slotDatas = this.skeleton.data.slots;
        for (var i = 0, n = slotDatas.length; i < n; i++) {
            if (slotDatas[i] == data) {
                this.setAttachment(!data.attachmentName ? null : this.skeleton.getAttachmentBySlotIndex(i, data.attachmentName));
                break;
            }
        }
    }
};

spine.Skin = function (name) {
    this.name = name;
    this.attachments = {};
};
spine.Skin.prototype = {
    addAttachment: function (slotIndex, name, attachment) {
        this.attachments[slotIndex + ":" + name] = attachment;
    },
    getAttachment: function (slotIndex, name) {
        return this.attachments[slotIndex + ":" + name];
    },
    _attachAll: function (skeleton, oldSkin) {
        for (var key in oldSkin.attachments) {
            var colon = key.indexOf(":");
            var slotIndex = parseInt(key.substring(0, colon), 10);
            var name = key.substring(colon + 1);
            var slot = skeleton.slots[slotIndex];
            if (slot.attachment && slot.attachment.name == name) {
                var attachment = this.getAttachment(slotIndex, name);
                if (attachment) slot.setAttachment(attachment);
            }
        }
    }
};

spine.Animation = function (name, timelines, duration) {
    this.name = name;
    this.timelines = timelines;
    this.duration = duration;
};
spine.Animation.prototype = {
    apply: function (skeleton, time, loop) {
        if (loop && this.duration) time %= this.duration;
        var timelines = this.timelines;
        for (var i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, time, 1);
    },
    mix: function (skeleton, time, loop, alpha) {
        if (loop && this.duration) time %= this.duration;
        var timelines = this.timelines;
        for (var i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, time, alpha);
    }
};

spine.binarySearch = function (values, target, step) {
    var low = 0;
    var high = Math.floor(values.length / step) - 2;
    if (!high) return step;
    var current = high >>> 1;
    while (true) {
        if (values[(current + 1) * step] <= target)
            low = current + 1;
        else
            high = current;
        if (low == high) return (low + 1) * step;
        current = (low + high) >>> 1;
    }
};
spine.linearSearch = function (values, target, step) {
    for (var i = 0, last = values.length - step; i <= last; i += step)
        if (values[i] > target) return i;
    return -1;
};

spine.Curves = function (frameCount) {
    this.curves = []; // dfx, dfy, ddfx, ddfy, dddfx, dddfy, ...
    this.curves.length = (frameCount - 1) * 6;
};
spine.Curves.prototype = {
    setLinear: function (frameIndex) {
        this.curves[frameIndex * 6] = 0/*LINEAR*/;
    },
    setStepped: function (frameIndex) {
        this.curves[frameIndex * 6] = -1/*STEPPED*/;
    },
    /** Sets the control handle positions for an interpolation bezier curve used to transition from this keyframe to the next.
     * cx1 and cx2 are from 0 to 1, representing the percent of time between the two keyframes. cy1 and cy2 are the percent of
     * the difference between the keyframe's values. */
    setCurve: function (frameIndex, cx1, cy1, cx2, cy2) {
        var subdiv_step = 1 / 10/*BEZIER_SEGMENTS*/;
        var subdiv_step2 = subdiv_step * subdiv_step;
        var subdiv_step3 = subdiv_step2 * subdiv_step;
        var pre1 = 3 * subdiv_step;
        var pre2 = 3 * subdiv_step2;
        var pre4 = 6 * subdiv_step2;
        var pre5 = 6 * subdiv_step3;
        var tmp1x = -cx1 * 2 + cx2;
        var tmp1y = -cy1 * 2 + cy2;
        var tmp2x = (cx1 - cx2) * 3 + 1;
        var tmp2y = (cy1 - cy2) * 3 + 1;
        var i = frameIndex * 6;
        var curves = this.curves;
        curves[i] = cx1 * pre1 + tmp1x * pre2 + tmp2x * subdiv_step3;
        curves[i + 1] = cy1 * pre1 + tmp1y * pre2 + tmp2y * subdiv_step3;
        curves[i + 2] = tmp1x * pre4 + tmp2x * pre5;
        curves[i + 3] = tmp1y * pre4 + tmp2y * pre5;
        curves[i + 4] = tmp2x * pre5;
        curves[i + 5] = tmp2y * pre5;
    },
    getCurvePercent: function (frameIndex, percent) {
        percent = percent < 0 ? 0 : (percent > 1 ? 1 : percent);
        var curveIndex = frameIndex * 6;
        var curves = this.curves;
        var dfx = curves[curveIndex];
        if (!dfx/*LINEAR*/) return percent;
        if (dfx == -1/*STEPPED*/) return 0;
        var dfy = curves[curveIndex + 1];
        var ddfx = curves[curveIndex + 2];
        var ddfy = curves[curveIndex + 3];
        var dddfx = curves[curveIndex + 4];
        var dddfy = curves[curveIndex + 5];
        var x = dfx, y = dfy;
        var i = 10/*BEZIER_SEGMENTS*/ - 2;
        while (true) {
            if (x >= percent) {
                var lastX = x - dfx;
                var lastY = y - dfy;
                return lastY + (y - lastY) * (percent - lastX) / (x - lastX);
            }
            if (!i) break;
            i--;
            dfx += ddfx;
            dfy += ddfy;
            ddfx += dddfx;
            ddfy += dddfy;
            x += dfx;
            y += dfy;
        }
        return y + (1 - y) * (percent - x) / (1 - x); // Last point is 1,1.
    }
};

spine.RotateTimeline = function (frameCount) {
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, angle, ...
    this.frames.length = frameCount * 2;
};
spine.RotateTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function () {
        return this.frames.length / 2;
    },
    setFrame: function (frameIndex, time, angle) {
        frameIndex *= 2;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = angle;
    },
    apply: function (skeleton, time, alpha) {
        var frames = this.frames,
            amount;

        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 2]) { // Time is after last frame.
            amount = bone.data.rotation + frames[frames.length - 1] - bone.rotation;
            while (amount > 180)
                amount -= 360;
            while (amount < -180)
                amount += 360;
            bone.rotation += amount * alpha;
            return;
        }

        // Interpolate between the last frame and the current frame.
        var frameIndex = spine.binarySearch(frames, time, 2);
        var lastFrameValue = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex - 2/*LAST_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 2 - 1, percent);

        amount = frames[frameIndex + 1/*FRAME_VALUE*/] - lastFrameValue;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        amount = bone.data.rotation + (lastFrameValue + amount * percent) - bone.rotation;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        bone.rotation += amount * alpha;
    }
};

spine.TranslateTimeline = function (frameCount) {
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, x, y, ...
    this.frames.length = frameCount * 3;
};
spine.TranslateTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function () {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, x, y) {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = x;
        this.frames[frameIndex + 2] = y;
    },
    apply: function (skeleton, time, alpha) {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 3]) { // Time is after last frame.
            bone.x += (bone.data.x + frames[frames.length - 2] - bone.x) * alpha;
            bone.y += (bone.data.y + frames[frames.length - 1] - bone.y) * alpha;
            return;
        }

        // Interpolate between the last frame and the current frame.
        var frameIndex = spine.binarySearch(frames, time, 3);
        var lastFrameX = frames[frameIndex - 2];
        var lastFrameY = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*LAST_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        bone.x += (bone.data.x + lastFrameX + (frames[frameIndex + 1/*FRAME_X*/] - lastFrameX) * percent - bone.x) * alpha;
        bone.y += (bone.data.y + lastFrameY + (frames[frameIndex + 2/*FRAME_Y*/] - lastFrameY) * percent - bone.y) * alpha;
    }
};

spine.ScaleTimeline = function (frameCount) {
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, x, y, ...
    this.frames.length = frameCount * 3;
};
spine.ScaleTimeline.prototype = {
    boneIndex: 0,
    getFrameCount: function () {
        return this.frames.length / 3;
    },
    setFrame: function (frameIndex, time, x, y) {
        frameIndex *= 3;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = x;
        this.frames[frameIndex + 2] = y;
    },
    apply: function (skeleton, time, alpha) {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var bone = skeleton.bones[this.boneIndex];

        if (time >= frames[frames.length - 3]) { // Time is after last frame.
            bone.scaleX += (bone.data.scaleX - 1 + frames[frames.length - 2] - bone.scaleX) * alpha;
            bone.scaleY += (bone.data.scaleY - 1 + frames[frames.length - 1] - bone.scaleY) * alpha;
            return;
        }

        // Interpolate between the last frame and the current frame.
        var frameIndex = spine.binarySearch(frames, time, 3);
        var lastFrameX = frames[frameIndex - 2];
        var lastFrameY = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex + -3/*LAST_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 3 - 1, percent);

        bone.scaleX += (bone.data.scaleX - 1 + lastFrameX + (frames[frameIndex + 1/*FRAME_X*/] - lastFrameX) * percent - bone.scaleX) * alpha;
        bone.scaleY += (bone.data.scaleY - 1 + lastFrameY + (frames[frameIndex + 2/*FRAME_Y*/] - lastFrameY) * percent - bone.scaleY) * alpha;
    }
};

spine.ColorTimeline = function (frameCount) {
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, r, g, b, a, ...
    this.frames.length = frameCount * 5;
};
spine.ColorTimeline.prototype = {
    slotIndex: 0,
    getFrameCount: function () {
        return this.frames.length / 2;
    },
    setFrame: function (frameIndex, time, x, y) {
        frameIndex *= 5;
        this.frames[frameIndex] = time;
        this.frames[frameIndex + 1] = r;
        this.frames[frameIndex + 2] = g;
        this.frames[frameIndex + 3] = b;
        this.frames[frameIndex + 4] = a;
    },
    apply: function (skeleton, time, alpha) {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var slot = skeleton.slots[this.slotIndex];

        if (time >= frames[frames.length - 5]) { // Time is after last frame.
            var i = frames.length - 1;
            slot.r = frames[i - 3];
            slot.g = frames[i - 2];
            slot.b = frames[i - 1];
            slot.a = frames[i];
            return;
        }

        // Interpolate between the last frame and the current frame.
        var frameIndex = spine.binarySearch(frames, time, 5);
        var lastFrameR = frames[frameIndex - 4];
        var lastFrameG = frames[frameIndex - 3];
        var lastFrameB = frames[frameIndex - 2];
        var lastFrameA = frames[frameIndex - 1];
        var frameTime = frames[frameIndex];
        var percent = 1 - (time - frameTime) / (frames[frameIndex - 5/*LAST_FRAME_TIME*/] - frameTime);
        percent = this.curves.getCurvePercent(frameIndex / 5 - 1, percent);

        var r = lastFrameR + (frames[frameIndex + 1/*FRAME_R*/] - lastFrameR) * percent;
        var g = lastFrameG + (frames[frameIndex + 2/*FRAME_G*/] - lastFrameG) * percent;
        var b = lastFrameB + (frames[frameIndex + 3/*FRAME_B*/] - lastFrameB) * percent;
        var a = lastFrameA + (frames[frameIndex + 4/*FRAME_A*/] - lastFrameA) * percent;
        if (alpha < 1) {
            slot.r += (r - slot.r) * alpha;
            slot.g += (g - slot.g) * alpha;
            slot.b += (b - slot.b) * alpha;
            slot.a += (a - slot.a) * alpha;
        } else {
            slot.r = r;
            slot.g = g;
            slot.b = b;
            slot.a = a;
        }
    }
};

spine.AttachmentTimeline = function (frameCount) {
    this.curves = new spine.Curves(frameCount);
    this.frames = []; // time, ...
    this.frames.length = frameCount;
    this.attachmentNames = []; // time, ...
    this.attachmentNames.length = frameCount;
};
spine.AttachmentTimeline.prototype = {
    slotIndex: 0,
    getFrameCount: function () {
            return this.frames.length;
    },
    setFrame: function (frameIndex, time, attachmentName) {
        this.frames[frameIndex] = time;
        this.attachmentNames[frameIndex] = attachmentName;
    },
    apply: function (skeleton, time, alpha) {
        var frames = this.frames;
        if (time < frames[0]) return; // Time is before first frame.

        var frameIndex;
        if (time >= frames[frames.length - 1]) // Time is after last frame.
            frameIndex = frames.length - 1;
        else
            frameIndex = spine.binarySearch(frames, time, 1) - 1;

        var attachmentName = this.attachmentNames[frameIndex];
        skeleton.slots[this.slotIndex].setAttachment(!attachmentName ? null : skeleton.getAttachmentBySlotIndex(this.slotIndex, attachmentName));
    }
};

spine.SkeletonData = function () {
    this.bones = [];
    this.slots = [];
    this.skins = [];
    this.animations = [];
};
spine.SkeletonData.prototype = {
    defaultSkin: null,
    /** @return May be null. */
    findBone: function (boneName) {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].name == boneName) return bones[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findBoneIndex: function (boneName) {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].name == boneName) return i;
        return -1;
    },
    /** @return May be null. */
    findSlot: function (slotName) {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++) {
            if (slots[i].name == slotName) return slot[i];
        }
        return null;
    },
    /** @return -1 if the bone was not found. */
    findSlotIndex: function (slotName) {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].name == slotName) return i;
        return -1;
    },
    /** @return May be null. */
    findSkin: function (skinName) {
        var skins = this.skins;
        for (var i = 0, n = skins.length; i < n; i++)
            if (skins[i].name == skinName) return skins[i];
        return null;
    },
    /** @return May be null. */
    findAnimation: function (animationName) {
        var animations = this.animations;
        for (var i = 0, n = animations.length; i < n; i++)
            if (animations[i].name == animationName) return animations[i];
        return null;
    }
};

spine.Skeleton = function (skeletonData) {
    this.data = skeletonData;

    this.bones = [];
    for (var i = 0, n = skeletonData.bones.length; i < n; i++) {
        var boneData = skeletonData.bones[i];
        var parent = !boneData.parent ? null : this.bones[skeletonData.bones.indexOf(boneData.parent)];
        this.bones.push(new spine.Bone(boneData, parent));
    }

    this.slots = [];
    this.drawOrder = [];
    for (i = 0, n = skeletonData.slots.length; i < n; i++) {
        var slotData = skeletonData.slots[i];
        var bone = this.bones[skeletonData.bones.indexOf(slotData.boneData)];
        var slot = new spine.Slot(slotData, this, bone);
        this.slots.push(slot);
        this.drawOrder.push(slot);
    }
};
spine.Skeleton.prototype = {
    x: 0, y: 0,
    skin: null,
    r: 1, g: 1, b: 1, a: 1,
    time: 0,
    flipX: false, flipY: false,
    /** Updates the world transform for each bone. */
    updateWorldTransform: function () {
        var flipX = this.flipX;
        var flipY = this.flipY;
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            bones[i].updateWorldTransform(flipX, flipY);
    },
    /** Sets the bones and slots to their setup pose values. */
    setToSetupPose: function () {
        this.setBonesToSetupPose();
        this.setSlotsToSetupPose();
    },
    setBonesToSetupPose: function () {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            bones[i].setToSetupPose();
    },
    setSlotsToSetupPose: function () {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            slots[i].setToSetupPose(i);
    },
    /** @return May return null. */
    getRootBone: function () {
        return this.bones.length ? this.bones[0] : null;
    },
    /** @return May be null. */
    findBone: function (boneName) {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].data.name == boneName) return bones[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findBoneIndex: function (boneName) {
        var bones = this.bones;
        for (var i = 0, n = bones.length; i < n; i++)
            if (bones[i].data.name == boneName) return i;
        return -1;
    },
    /** @return May be null. */
    findSlot: function (slotName) {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].data.name == slotName) return slots[i];
        return null;
    },
    /** @return -1 if the bone was not found. */
    findSlotIndex: function (slotName) {
        var slots = this.slots;
        for (var i = 0, n = slots.length; i < n; i++)
            if (slots[i].data.name == slotName) return i;
        return -1;
    },
    setSkinByName: function (skinName) {
        var skin = this.data.findSkin(skinName);
        if (!skin) throw "Skin not found: " + skinName;
        this.setSkin(skin);
    },
    /** Sets the skin used to look up attachments not found in the {@link SkeletonData#getDefaultSkin() default skin}. Attachments
     * from the new skin are attached if the corresponding attachment from the old skin was attached.
     * @param newSkin May be null. */
    setSkin: function (newSkin) {
        if (this.skin && newSkin) newSkin._attachAll(this, this.skin);
        this.skin = newSkin;
    },
    /** @return May be null. */
    getAttachmentBySlotName: function (slotName, attachmentName) {
        return this.getAttachmentBySlotIndex(this.data.findSlotIndex(slotName), attachmentName);
    },
    /** @return May be null. */
    getAttachmentBySlotIndex: function (slotIndex, attachmentName) {
        if (this.skin) {
            var attachment = this.skin.getAttachment(slotIndex, attachmentName);
            if (attachment) return attachment;
        }
        if (this.data.defaultSkin) return this.data.defaultSkin.getAttachment(slotIndex, attachmentName);
        return null;
    },
    /** @param attachmentName May be null. */
    setAttachment: function (slotName, attachmentName) {
        var slots = this.slots;
        for (var i = 0, n = slots.size; i < n; i++) {
            var slot = slots[i];
            if (slot.data.name == slotName) {
                var attachment = null;
                if (attachmentName) {
                    attachment = this.getAttachment(i, attachmentName);
                    if (attachment == null) throw "Attachment not found: " + attachmentName + ", for slot: " + slotName;
                }
                slot.setAttachment(attachment);
                return;
            }
        }
        throw "Slot not found: " + slotName;
    },
    update: function (delta) {
        time += delta;
    }
};

spine.AttachmentType = {
    region: 0
};

spine.RegionAttachment = function () {
    this.offset = [];
    this.offset.length = 8;
    this.uvs = [];
    this.uvs.length = 8;
};
spine.RegionAttachment.prototype = {
    x: 0, y: 0,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    width: 0, height: 0,
    rendererObject: null,
    regionOffsetX: 0, regionOffsetY: 0,
    regionWidth: 0, regionHeight: 0,
    regionOriginalWidth: 0, regionOriginalHeight: 0,
    setUVs: function (u, v, u2, v2, rotate) {
        var uvs = this.uvs;
        if (rotate) {
            uvs[2/*X2*/] = u;
            uvs[3/*Y2*/] = v2;
            uvs[4/*X3*/] = u;
            uvs[5/*Y3*/] = v;
            uvs[6/*X4*/] = u2;
            uvs[7/*Y4*/] = v;
            uvs[0/*X1*/] = u2;
            uvs[1/*Y1*/] = v2;
        } else {
            uvs[0/*X1*/] = u;
            uvs[1/*Y1*/] = v2;
            uvs[2/*X2*/] = u;
            uvs[3/*Y2*/] = v;
            uvs[4/*X3*/] = u2;
            uvs[5/*Y3*/] = v;
            uvs[6/*X4*/] = u2;
            uvs[7/*Y4*/] = v2;
        }
    },
    updateOffset: function () {
        var regionScaleX = this.width / this.regionOriginalWidth * this.scaleX;
        var regionScaleY = this.height / this.regionOriginalHeight * this.scaleY;
        var localX = -this.width / 2 * this.scaleX + this.regionOffsetX * regionScaleX;
        var localY = -this.height / 2 * this.scaleY + this.regionOffsetY * regionScaleY;
        var localX2 = localX + this.regionWidth * regionScaleX;
        var localY2 = localY + this.regionHeight * regionScaleY;
        var radians = this.rotation * Math.PI / 180;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var localXCos = localX * cos + this.x;
        var localXSin = localX * sin;
        var localYCos = localY * cos + this.y;
        var localYSin = localY * sin;
        var localX2Cos = localX2 * cos + this.x;
        var localX2Sin = localX2 * sin;
        var localY2Cos = localY2 * cos + this.y;
        var localY2Sin = localY2 * sin;
        var offset = this.offset;
        offset[0/*X1*/] = localXCos - localYSin;
        offset[1/*Y1*/] = localYCos + localXSin;
        offset[2/*X2*/] = localXCos - localY2Sin;
        offset[3/*Y2*/] = localY2Cos + localXSin;
        offset[4/*X3*/] = localX2Cos - localY2Sin;
        offset[5/*Y3*/] = localY2Cos + localX2Sin;
        offset[6/*X4*/] = localX2Cos - localYSin;
        offset[7/*Y4*/] = localYCos + localX2Sin;
    },
    computeVertices: function (x, y, bone, vertices) {
        x += bone.worldX;
        y += bone.worldY;
        var m00 = bone.m00;
        var m01 = bone.m01;
        var m10 = bone.m10;
        var m11 = bone.m11;
        var offset = this.offset;
        vertices[0/*X1*/] = offset[0/*X1*/] * m00 + offset[1/*Y1*/] * m01 + x;
        vertices[1/*Y1*/] = offset[0/*X1*/] * m10 + offset[1/*Y1*/] * m11 + y;
        vertices[2/*X2*/] = offset[2/*X2*/] * m00 + offset[3/*Y2*/] * m01 + x;
        vertices[3/*Y2*/] = offset[2/*X2*/] * m10 + offset[3/*Y2*/] * m11 + y;
        vertices[4/*X3*/] = offset[4/*X3*/] * m00 + offset[5/*X3*/] * m01 + x;
        vertices[5/*X3*/] = offset[4/*X3*/] * m10 + offset[5/*X3*/] * m11 + y;
        vertices[6/*X4*/] = offset[6/*X4*/] * m00 + offset[7/*Y4*/] * m01 + x;
        vertices[7/*Y4*/] = offset[6/*X4*/] * m10 + offset[7/*Y4*/] * m11 + y;
    }
}

spine.AnimationStateData = function (skeletonData) {
    this.skeletonData = skeletonData;
    this.animationToMixTime = {};
};
spine.AnimationStateData.prototype = {
        defaultMix: 0,
    setMixByName: function (fromName, toName, duration) {
        var from = this.skeletonData.findAnimation(fromName);
        if (!from) throw "Animation not found: " + fromName;
        var to = this.skeletonData.findAnimation(toName);
        if (!to) throw "Animation not found: " + toName;
        this.setMix(from, to, duration);
    },
    setMix: function (from, to, duration) {
        this.animationToMixTime[from.name + ":" + to.name] = duration;
    },
    getMix: function (from, to) {
        var time = this.animationToMixTime[from.name + ":" + to.name];
            return time ? time : this.defaultMix;
    }
};

spine.AnimationState = function (stateData) {
    this.data = stateData;
    this.queue = [];
};
spine.AnimationState.prototype = {
    current: null,
    previous: null,
    currentTime: 0,
    previousTime: 0,
    currentLoop: false,
    previousLoop: false,
    mixTime: 0,
    mixDuration: 0,
    update: function (delta) {
        this.currentTime += delta;
        this.previousTime += delta;
        this.mixTime += delta;

        if (this.queue.length > 0) {
            var entry = this.queue[0];
            if (this.currentTime >= entry.delay) {
                this._setAnimation(entry.animation, entry.loop);
                this.queue.shift();
            }
        }
    },
    apply: function (skeleton) {
        if (!this.current) return;
        if (this.previous) {
            this.previous.apply(skeleton, this.previousTime, this.previousLoop);
            var alpha = this.mixTime / this.mixDuration;
            if (alpha >= 1) {
                alpha = 1;
                this.previous = null;
            }
            this.current.mix(skeleton, this.currentTime, this.currentLoop, alpha);
        } else
            this.current.apply(skeleton, this.currentTime, this.currentLoop);
    },
    clearAnimation: function () {
        this.previous = null;
        this.current = null;
        this.queue.length = 0;
    },
    _setAnimation: function (animation, loop) {
        this.previous = null;
        if (animation && this.current) {
            this.mixDuration = this.data.getMix(this.current, animation);
            if (this.mixDuration > 0) {
                this.mixTime = 0;
                this.previous = this.current;
                this.previousTime = this.currentTime;
                this.previousLoop = this.currentLoop;
            }
        }
        this.current = animation;
        this.currentLoop = loop;
        this.currentTime = 0;
    },
    /** @see #setAnimation(Animation, Boolean) */
    setAnimationByName: function (animationName, loop) {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation) throw "Animation not found: " + animationName;
        this.setAnimation(animation, loop);
    },
    /** Set the current animation. Any queued animations are cleared and the current animation time is set to 0.
     * @param animation May be null. */
    setAnimation: function (animation, loop) {
        this.queue.length = 0;
        this._setAnimation(animation, loop);
    },
    /** @see #addAnimation(Animation, Boolean, Number) */
    addAnimationByName: function (animationName, loop, delay) {
        var animation = this.data.skeletonData.findAnimation(animationName);
        if (!animation) throw "Animation not found: " + animationName;
        this.addAnimation(animation, loop, delay);
    },
    /** Adds an animation to be played delay seconds after the current or last queued animation.
     * @param delay May be <= 0 to use duration of previous animation minus any mix duration plus the negative delay. */
    addAnimation: function (animation, loop, delay) {
        var entry = {};
        entry.animation = animation;
        entry.loop = loop;

        if (!delay || delay <= 0) {
            var previousAnimation = this.queue.length ? this.queue[this.queue.length - 1].animation : this.current;
            if (previousAnimation != null)
                delay = previousAnimation.duration - this.data.getMix(previousAnimation, animation) + (delay || 0);
            else
                delay = 0;
        }
        entry.delay = delay;

        this.queue.push(entry);
    },
    /** Returns true if no animation is set or if the current time is greater than the animation duration, regardless of looping. */
    isComplete: function () {
        return !this.current || this.currentTime >= this.current.duration;
    }
};

spine.SkeletonJson = function (attachmentLoader) {
    this.attachmentLoader = attachmentLoader;
};
spine.SkeletonJson.prototype = {
    scale: 1,
    readSkeletonData: function (root) {
        /*jshint -W069*/
        var skeletonData = new spine.SkeletonData(),
            boneData;

        // Bones.
        var bones = root["bones"];
        for (var i = 0, n = bones.length; i < n; i++) {
            var boneMap = bones[i];
            var parent = null;
            if (boneMap["parent"]) {
                parent = skeletonData.findBone(boneMap["parent"]);
                if (!parent) throw "Parent bone not found: " + boneMap["parent"];
            }
            boneData = new spine.BoneData(boneMap["name"], parent);
            boneData.length = (boneMap["length"] || 0) * this.scale;
            boneData.x = (boneMap["x"] || 0) * this.scale;
            boneData.y = (boneMap["y"] || 0) * this.scale;
            boneData.rotation = (boneMap["rotation"] || 0);
            boneData.scaleX = boneMap["scaleX"] || 1;
            boneData.scaleY = boneMap["scaleY"] || 1;
            skeletonData.bones.push(boneData);
        }

        // Slots.
        var slots = root["slots"];
        for (i = 0, n = slots.length; i < n; i++) {
            var slotMap = slots[i];
            boneData = skeletonData.findBone(slotMap["bone"]);
            if (!boneData) throw "Slot bone not found: " + slotMap["bone"];
            var slotData = new spine.SlotData(slotMap["name"], boneData);

            var color = slotMap["color"];
            if (color) {
                slotData.r = spine.SkeletonJson.toColor(color, 0);
                slotData.g = spine.SkeletonJson.toColor(color, 1);
                slotData.b = spine.SkeletonJson.toColor(color, 2);
                slotData.a = spine.SkeletonJson.toColor(color, 3);
            }

            slotData.attachmentName = slotMap["attachment"];

            skeletonData.slots.push(slotData);
        }

        // Skins.
        var skins = root["skins"];
        for (var skinName in skins) {
            if (!skins.hasOwnProperty(skinName)) continue;
            var skinMap = skins[skinName];
            var skin = new spine.Skin(skinName);
            for (var slotName in skinMap) {
                if (!skinMap.hasOwnProperty(slotName)) continue;
                var slotIndex = skeletonData.findSlotIndex(slotName);
                var slotEntry = skinMap[slotName];
                for (var attachmentName in slotEntry) {
                    if (!slotEntry.hasOwnProperty(attachmentName)) continue;
                    var attachment = this.readAttachment(skin, attachmentName, slotEntry[attachmentName]);
                    if (attachment != null) skin.addAttachment(slotIndex, attachmentName, attachment);
                }
            }
            skeletonData.skins.push(skin);
            if (skin.name == "default") skeletonData.defaultSkin = skin;
        }

        // Animations.
        var animations = root["animations"];
        for (var animationName in animations) {
            if (!animations.hasOwnProperty(animationName)) continue;
            this.readAnimation(animationName, animations[animationName], skeletonData);
        }

        return skeletonData;
    },
    readAttachment: function (skin, name, map) {
        /*jshint -W069*/
        name = map["name"] || name;

        var type = spine.AttachmentType[map["type"] || "region"];

        if (type == spine.AttachmentType.region) {
            var attachment = new spine.RegionAttachment();
            attachment.x = (map["x"] || 0) * this.scale;
            attachment.y = (map["y"] || 0) * this.scale;
            attachment.scaleX = map["scaleX"] || 1;
            attachment.scaleY = map["scaleY"] || 1;
            attachment.rotation = map["rotation"] || 0;
            attachment.width = (map["width"] || 32) * this.scale;
            attachment.height = (map["height"] || 32) * this.scale;
            attachment.updateOffset();

            attachment.rendererObject = {};
            attachment.rendererObject.name = name;
            attachment.rendererObject.scale = {};
            attachment.rendererObject.scale.x = attachment.scaleX;
            attachment.rendererObject.scale.y = attachment.scaleY;
            attachment.rendererObject.rotation = -attachment.rotation * Math.PI / 180;
            return attachment;
        }

            throw "Unknown attachment type: " + type;
    },

    readAnimation: function (name, map, skeletonData) {
        /*jshint -W069*/
        var timelines = [];
        var duration = 0;
        var frameIndex, timeline, timelineName, valueMap, values,
            i, n;

        var bones = map["bones"];
        for (var boneName in bones) {
            if (!bones.hasOwnProperty(boneName)) continue;
            var boneIndex = skeletonData.findBoneIndex(boneName);
            if (boneIndex == -1) throw "Bone not found: " + boneName;
            var boneMap = bones[boneName];

            for (timelineName in boneMap) {
                if (!boneMap.hasOwnProperty(timelineName)) continue;
                values = boneMap[timelineName];
                if (timelineName == "rotate") {
                    timeline = new spine.RotateTimeline(values.length);
                    timeline.boneIndex = boneIndex;

                    frameIndex = 0;
                    for (i = 0, n = values.length; i < n; i++) {
                        valueMap = values[i];
                        timeline.setFrame(frameIndex, valueMap["time"], valueMap["angle"]);
                        spine.SkeletonJson.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 2 - 2]);

                } else if (timelineName == "translate" || timelineName == "scale") {
                    var timelineScale = 1;
                    if (timelineName == "scale")
                        timeline = new spine.ScaleTimeline(values.length);
                    else {
                        timeline = new spine.TranslateTimeline(values.length);
                        timelineScale = this.scale;
                    }
                    timeline.boneIndex = boneIndex;

                    frameIndex = 0;
                    for (i = 0, n = values.length; i < n; i++) {
                        valueMap = values[i];
                        var x = (valueMap["x"] || 0) * timelineScale;
                        var y = (valueMap["y"] || 0) * timelineScale;
                        timeline.setFrame(frameIndex, valueMap["time"], x, y);
                        spine.SkeletonJson.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 3 - 3]);

                } else
                    throw "Invalid timeline type for a bone: " + timelineName + " (" + boneName + ")";
            }
        }
        var slots = map["slots"];
        for (var slotName in slots) {
            if (!slots.hasOwnProperty(slotName)) continue;
            var slotMap = slots[slotName];
            var slotIndex = skeletonData.findSlotIndex(slotName);

            for (timelineName in slotMap) {
                if (!slotMap.hasOwnProperty(timelineName)) continue;
                values = slotMap[timelineName];
                if (timelineName == "color") {
                    timeline = new spine.ColorTimeline(values.length);
                    timeline.slotIndex = slotIndex;

                    frameIndex = 0;
                    for (i = 0, n = values.length; i < n; i++) {
                        valueMap = values[i];
                        var color = valueMap["color"];
                        var r = spine.SkeletonJson.toColor(color, 0);
                        var g = spine.SkeletonJson.toColor(color, 1);
                        var b = spine.SkeletonJson.toColor(color, 2);
                        var a = spine.SkeletonJson.toColor(color, 3);
                        timeline.setFrame(frameIndex, valueMap["time"], r, g, b, a);
                        spine.SkeletonJson.readCurve(timeline, frameIndex, valueMap);
                        frameIndex++;
                    }
                    timelines.push(timeline);
                    duration = Math.max(duration, timeline.frames[timeline.getFrameCount() * 5 - 5]);

                } else if (timelineName == "attachment") {
                    timeline = new spine.AttachmentTimeline(values.length);
                    timeline.slotIndex = slotIndex;

                    frameIndex = 0;
                    for (i = 0, n = values.length; i < n; i++) {
                        valueMap = values[i];
                        timeline.setFrame(frameIndex++, valueMap["time"], valueMap["name"]);
                    }
                    timelines.push(timeline);
                        duration = Math.max(duration, timeline.frames[timeline.getFrameCount() - 1]);

                } else
                    throw "Invalid timeline type for a slot: " + timelineName + " (" + slotName + ")";
            }
        }
        skeletonData.animations.push(new spine.Animation(name, timelines, duration));
    }
};
spine.SkeletonJson.readCurve = function (timeline, frameIndex, valueMap) {
    /*jshint -W069*/
    var curve = valueMap["curve"];
    if (!curve) return;
    if (curve == "stepped")
        timeline.curves.setStepped(frameIndex);
    else if (curve instanceof Array)
        timeline.curves.setCurve(frameIndex, curve[0], curve[1], curve[2], curve[3]);
};
spine.SkeletonJson.toColor = function (hexString, colorIndex) {
    if (hexString.length != 8) throw "Color hexidecimal length must be 8, recieved: " + hexString;
    return parseInt(hexString.substring(colorIndex * 2, 2), 16) / 255;
};

spine.Atlas = function (atlasText, textureLoader) {
    this.textureLoader = textureLoader;
    this.pages = [];
    this.regions = [];

    var reader = new spine.AtlasReader(atlasText);
    var tuple = [];
    tuple.length = 4;
    var page = null;
    while (true) {
        var line = reader.readLine();
        if (line == null) break;
        line = reader.trim(line);
        if (!line.length)
            page = null;
        else if (!page) {
            page = new spine.AtlasPage();
            page.name = line;

            page.format = spine.Atlas.Format[reader.readValue()];

            reader.readTuple(tuple);
            page.minFilter = spine.Atlas.TextureFilter[tuple[0]];
            page.magFilter = spine.Atlas.TextureFilter[tuple[1]];

            var direction = reader.readValue();
            page.uWrap = spine.Atlas.TextureWrap.clampToEdge;
            page.vWrap = spine.Atlas.TextureWrap.clampToEdge;
            if (direction == "x")
                page.uWrap = spine.Atlas.TextureWrap.repeat;
            else if (direction == "y")
                page.vWrap = spine.Atlas.TextureWrap.repeat;
            else if (direction == "xy")
                page.uWrap = page.vWrap = spine.Atlas.TextureWrap.repeat;

            textureLoader.load(page, line);

            this.pages.push(page);

        } else {
            var region = new spine.AtlasRegion();
            region.name = line;
            region.page = page;

            region.rotate = reader.readValue() == "true";

            reader.readTuple(tuple);
            var x = parseInt(tuple[0], 10);
            var y = parseInt(tuple[1], 10);

            reader.readTuple(tuple);
            var width = parseInt(tuple[0], 10);
            var height = parseInt(tuple[1], 10);

            region.u = x / page.width;
            region.v = y / page.height;
            if (region.rotate) {
                region.u2 = (x + height) / page.width;
                region.v2 = (y + width) / page.height;
            } else {
                region.u2 = (x + width) / page.width;
                region.v2 = (y + height) / page.height;
            }
            region.x = x;
            region.y = y;
            region.width = Math.abs(width);
            region.height = Math.abs(height);

            if (reader.readTuple(tuple) == 4) { // split is optional
                region.splits = [parseInt(tuple[0], 10), parseInt(tuple[1], 10), parseInt(tuple[2], 10), parseInt(tuple[3], 10)];

                if (reader.readTuple(tuple) == 4) { // pad is optional, but only present with splits
                    region.pads = [parseInt(tuple[0], 10), parseInt(tuple[1], 10), parseInt(tuple[2], 10), parseInt(tuple[3], 10)];

                    reader.readTuple(tuple);
                }
            }

            region.originalWidth = parseInt(tuple[0], 10);
            region.originalHeight = parseInt(tuple[1], 10);

            reader.readTuple(tuple);
            region.offsetX = parseInt(tuple[0], 10);
            region.offsetY = parseInt(tuple[1], 10);

            region.index = parseInt(reader.readValue(), 10);

            this.regions.push(region);
        }
    }
};
spine.Atlas.prototype = {
    findRegion: function (name) {
        var regions = this.regions;
        for (var i = 0, n = regions.length; i < n; i++)
            if (regions[i].name == name) return regions[i];
        return null;
    },
    dispose: function () {
        var pages = this.pages;
        for (var i = 0, n = pages.length; i < n; i++)
            this.textureLoader.unload(pages[i].rendererObject);
    },
    updateUVs: function (page) {
        var regions = this.regions;
        for (var i = 0, n = regions.length; i < n; i++) {
            var region = regions[i];
            if (region.page != page) continue;
            region.u = region.x / page.width;
            region.v = region.y / page.height;
            if (region.rotate) {
                region.u2 = (region.x + region.height) / page.width;
                region.v2 = (region.y + region.width) / page.height;
            } else {
                region.u2 = (region.x + region.width) / page.width;
                region.v2 = (region.y + region.height) / page.height;
            }
        }
    }
};

spine.Atlas.Format = {
    alpha: 0,
    intensity: 1,
    luminanceAlpha: 2,
    rgb565: 3,
    rgba4444: 4,
    rgb888: 5,
    rgba8888: 6
};

spine.Atlas.TextureFilter = {
    nearest: 0,
    linear: 1,
    mipMap: 2,
    mipMapNearestNearest: 3,
    mipMapLinearNearest: 4,
    mipMapNearestLinear: 5,
    mipMapLinearLinear: 6
};

spine.Atlas.TextureWrap = {
    mirroredRepeat: 0,
    clampToEdge: 1,
    repeat: 2
};

spine.AtlasPage = function () {};
spine.AtlasPage.prototype = {
    name: null,
    format: null,
    minFilter: null,
    magFilter: null,
    uWrap: null,
    vWrap: null,
    rendererObject: null,
    width: 0,
    height: 0
};

spine.AtlasRegion = function () {};
spine.AtlasRegion.prototype = {
    page: null,
    name: null,
    x: 0, y: 0,
    width: 0, height: 0,
    u: 0, v: 0, u2: 0, v2: 0,
    offsetX: 0, offsetY: 0,
    originalWidth: 0, originalHeight: 0,
    index: 0,
    rotate: false,
    splits: null,
    pads: null,
};

spine.AtlasReader = function (text) {
    this.lines = text.split(/\r\n|\r|\n/);
};
spine.AtlasReader.prototype = {
    index: 0,
    trim: function (value) {
        return value.replace(/^\s+|\s+$/g, "");
    },
    readLine: function () {
        if (this.index >= this.lines.length) return null;
        return this.lines[this.index++];
    },
    readValue: function () {
        var line = this.readLine();
        var colon = line.indexOf(":");
        if (colon == -1) throw "Invalid line: " + line;
        return this.trim(line.substring(colon + 1));
    },
    /** Returns the number of tuple values read (2 or 4). */
    readTuple: function (tuple) {
        var line = this.readLine();
        var colon = line.indexOf(":");
        if (colon == -1) throw "Invalid line: " + line;
        var i = 0, lastMatch= colon + 1;
        for (; i < 3; i++) {
            var comma = line.indexOf(",", lastMatch);
            if (comma == -1) {
                if (!i) throw "Invalid line: " + line;
                break;
            }
            tuple[i] = this.trim(line.substr(lastMatch, comma - lastMatch));
            lastMatch = comma + 1;
        }
        tuple[i] = this.trim(line.substring(lastMatch));
        return i + 1;
    }
}

spine.AtlasAttachmentLoader = function (atlas) {
    this.atlas = atlas;
}
spine.AtlasAttachmentLoader.prototype = {
    newAttachment: function (skin, type, name) {
        switch (type) {
        case spine.AttachmentType.region:
            var region = this.atlas.findRegion(name);
            if (!region) throw "Region not found in atlas: " + name + " (" + type + ")";
            var attachment = new spine.RegionAttachment(name);
            attachment.rendererObject = region;
            attachment.setUVs(region.u, region.v, region.u2, region.v2, region.rotate);
            attachment.regionOffsetX = region.offsetX;
            attachment.regionOffsetY = region.offsetY;
            attachment.regionWidth = region.width;
            attachment.regionHeight = region.height;
            attachment.regionOriginalWidth = region.originalWidth;
            attachment.regionOriginalHeight = region.originalHeight;
            return attachment;
        }
        throw "Unknown attachment type: " + type;
    }
}

spine.Bone.yDown = true;
PIXI.AnimCache = {};

/**
 * A class that enables the you to import and run your spine animations in pixi.
 * Spine animation data needs to be loaded using the PIXI.AssetLoader or PIXI.SpineLoader before it can be used by this class
 * See example 12 (http://www.goodboydigital.com/pixijs/examples/12/) to see a working example and check out the source
 *
 * @class Spine
 * @extends DisplayObjectContainer
 * @constructor
 * @param url {String} The url of the spine anim file to be used
 */
PIXI.Spine = function (url) {
    PIXI.DisplayObjectContainer.call(this);

    this.spineData = PIXI.AnimCache[url];

    if (!this.spineData) {
        throw new Error("Spine data must be preloaded using PIXI.SpineLoader or PIXI.AssetLoader: " + url);
    }

    this.skeleton = new spine.Skeleton(this.spineData);
    this.skeleton.updateWorldTransform();

    this.stateData = new spine.AnimationStateData(this.spineData);
    this.state = new spine.AnimationState(this.stateData);

    this.slotContainers = [];

    for (var i = 0, n = this.skeleton.drawOrder.length; i < n; i++) {
        var slot = this.skeleton.drawOrder[i];
        var attachment = slot.attachment;
        var slotContainer = new PIXI.DisplayObjectContainer();
        this.slotContainers.push(slotContainer);
        this.addChild(slotContainer);
        if (!(attachment instanceof spine.RegionAttachment)) {
            continue;
        }
        var spriteName = attachment.rendererObject.name;
        var sprite = this.createSprite(slot, attachment.rendererObject);
        slot.currentSprite = sprite;
        slot.currentSpriteName = spriteName;
        slotContainer.addChild(sprite);
    }
};

PIXI.Spine.prototype = Object.create(PIXI.DisplayObjectContainer.prototype);
PIXI.Spine.prototype.constructor = PIXI.Spine;

/*
 * Updates the object transform for rendering
 *
 * @method updateTransform
 * @private
 */
PIXI.Spine.prototype.updateTransform = function () {
    this.lastTime = this.lastTime || Date.now();
    var timeDelta = (Date.now() - this.lastTime) * 0.001;
    this.lastTime = Date.now();
    this.state.update(timeDelta);
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform();

    var drawOrder = this.skeleton.drawOrder;
    for (var i = 0, n = drawOrder.length; i < n; i++) {
        var slot = drawOrder[i];
        var attachment = slot.attachment;
        var slotContainer = this.slotContainers[i];
        if (!(attachment instanceof spine.RegionAttachment)) {
            slotContainer.visible = false;
            continue;
        }

        if (attachment.rendererObject) {
            if (!slot.currentSpriteName || slot.currentSpriteName != attachment.name) {
                var spriteName = attachment.rendererObject.name;
                if (slot.currentSprite !== undefined) {
                    slot.currentSprite.visible = false;
                }
                slot.sprites = slot.sprites || {};
                if (slot.sprites[spriteName] !== undefined) {
                    slot.sprites[spriteName].visible = true;
                } else {
                    var sprite = this.createSprite(slot, attachment.rendererObject);
                    slotContainer.addChild(sprite);
                }
                slot.currentSprite = slot.sprites[spriteName];
                slot.currentSpriteName = spriteName;
            }
        }
        slotContainer.visible = true;

        var bone = slot.bone;

        slotContainer.position.x = bone.worldX + attachment.x * bone.m00 + attachment.y * bone.m01;
        slotContainer.position.y = bone.worldY + attachment.x * bone.m10 + attachment.y * bone.m11;
        slotContainer.scale.x = bone.worldScaleX;
        slotContainer.scale.y = bone.worldScaleY;

        slotContainer.rotation = -(slot.bone.worldRotation * Math.PI / 180);
    }

    PIXI.DisplayObjectContainer.prototype.updateTransform.call(this);
};


PIXI.Spine.prototype.createSprite = function (slot, descriptor) {
    var name = PIXI.TextureCache[descriptor.name] ? descriptor.name : descriptor.name + ".png";
    var sprite = new PIXI.Sprite(PIXI.Texture.fromFrame(name));
    sprite.scale = descriptor.scale;
    sprite.rotation = descriptor.rotation;
    sprite.anchor.x = sprite.anchor.y = 0.5;

    slot.sprites = slot.sprites || {};
    slot.sprites[descriptor.name] = sprite;
    return sprite;
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.BaseTextureCache = {};
PIXI.texturesToUpdate = [];
PIXI.texturesToDestroy = [];

PIXI.BaseTextureCacheIdGenerator = 0;

/**
 * A texture stores the information that represents an image. All textures have a base texture
 *
 * @class BaseTexture
 * @uses EventTarget
 * @constructor
 * @param source {String} the source object (image or canvas)
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 */
PIXI.BaseTexture = function(source, scaleMode)
{
    PIXI.EventTarget.call( this );

    /**
     * [read-only] The width of the base texture set when the image has loaded
     *
     * @property width
     * @type Number
     * @readOnly
     */
    this.width = 100;

    /**
     * [read-only] The height of the base texture set when the image has loaded
     *
     * @property height
     * @type Number
     * @readOnly
     */
    this.height = 100;

    /**
     * The scale mode to apply when scaling this texture
     * @property scaleMode
     * @type PIXI.scaleModes
     * @default PIXI.scaleModes.LINEAR
     */
    this.scaleMode = scaleMode || PIXI.scaleModes.DEFAULT;

    /**
     * [read-only] Describes if the base texture has loaded or not
     *
     * @property hasLoaded
     * @type Boolean
     * @readOnly
     */
    this.hasLoaded = false;

    /**
     * The source that is loaded to create the texture
     *
     * @property source
     * @type Image
     */
    this.source = source;

    //TODO will be used for futer pixi 1.5...
    this.id = PIXI.BaseTextureCacheIdGenerator++;

    // used for webGL
    this._glTextures = [];
    
    if(!source)return;

    if(this.source.complete || this.source.getContext)
    {
        this.hasLoaded = true;
        this.width = this.source.width;
        this.height = this.source.height;

        PIXI.texturesToUpdate.push(this);
    }
    else
    {

        var scope = this;
        this.source.onload = function() {

            scope.hasLoaded = true;
            scope.width = scope.source.width;
            scope.height = scope.source.height;

            // add it to somewhere...
            PIXI.texturesToUpdate.push(scope);
            scope.dispatchEvent( { type: 'loaded', content: scope } );
        };
    }

    this.imageUrl = null;
    this._powerOf2 = false;

    

};

PIXI.BaseTexture.prototype.constructor = PIXI.BaseTexture;

/**
 * Destroys this base texture
 *
 * @method destroy
 */
PIXI.BaseTexture.prototype.destroy = function()
{
    if(this.imageUrl)
    {
        delete PIXI.BaseTextureCache[this.imageUrl];
        this.imageUrl = null;
        this.source.src = null;
    }
    this.source = null;
    PIXI.texturesToDestroy.push(this);
};

/**
 * Changes the source image of the texture
 *
 * @method updateSourceImage
 * @param newSrc {String} the path of the image
 */
PIXI.BaseTexture.prototype.updateSourceImage = function(newSrc)
{
    this.hasLoaded = false;
    this.source.src = null;
    this.source.src = newSrc;
};

/**
 * Helper function that returns a base texture based on an image url
 * If the image is not in the base texture cache it will be created and loaded
 *
 * @static
 * @method fromImage
 * @param imageUrl {String} The image url of the texture
 * @param crossorigin {Boolean} 
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 * @return BaseTexture
 */
PIXI.BaseTexture.fromImage = function(imageUrl, crossorigin, scaleMode)
{
    var baseTexture = PIXI.BaseTextureCache[imageUrl];
    
    if(crossorigin === undefined)crossorigin = true;

    if(!baseTexture)
    {
        // new Image() breaks tex loading in some versions of Chrome.
        // See https://code.google.com/p/chromium/issues/detail?id=238071
        var image = new Image();//document.createElement('img');
        if (crossorigin)
        {
            image.crossOrigin = '';
        }
        image.src = imageUrl;
        baseTexture = new PIXI.BaseTexture(image, scaleMode);
        baseTexture.imageUrl = imageUrl;
        PIXI.BaseTextureCache[imageUrl] = baseTexture;
    }

    return baseTexture;
};

/**
 * Helper function that returns a base texture based on a canvas element
 * If the image is not in the base texture cache it will be created and loaded
 *
 * @static
 * @method fromCanvas
 * @param canvas {Canvas} The canvas element source of the texture
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 * @return BaseTexture
 */
PIXI.BaseTexture.fromCanvas = function(canvas, scaleMode)
{
    if(!canvas._pixiId)
    {
        canvas._pixiId = 'canvas_' + PIXI.TextureCacheIdGenerator++;
    }

    var baseTexture = PIXI.BaseTextureCache[canvas._pixiId];

    if(!baseTexture)
    {
        baseTexture = new PIXI.BaseTexture(canvas, scaleMode);
        PIXI.BaseTextureCache[canvas._pixiId] = baseTexture;
    }

    return baseTexture;
};



/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.TextureCache = {};
PIXI.FrameCache = {};

PIXI.TextureCacheIdGenerator = 0;

/**
 * A texture stores the information that represents an image or part of an image. It cannot be added
 * to the display list directly. To do this use PIXI.Sprite. If no frame is provided then the whole image is used
 *
 * @class Texture
 * @uses EventTarget
 * @constructor
 * @param baseTexture {BaseTexture} The base texture source to create the texture from
 * @param frame {Rectangle} The rectangle frame of the texture to show
 */
PIXI.Texture = function(baseTexture, frame)
{
    PIXI.EventTarget.call( this );

    if(!frame)
    {
        this.noFrame = true;
        frame = new PIXI.Rectangle(0,0,1,1);
    }

    if(baseTexture instanceof PIXI.Texture)
        baseTexture = baseTexture.baseTexture;

    /**
     * The base texture of that this texture uses
     *
     * @property baseTexture
     * @type BaseTexture
     */
    this.baseTexture = baseTexture;

    /**
     * The frame specifies the region of the base texture that this texture uses
     *
     * @property frame
     * @type Rectangle
     */
    this.frame = frame;

    /**
     * The trim point
     *
     * @property trim
     * @type Rectangle
     */
    this.trim = null;
  
    this.scope = this;

    this._uvs = null;
    
    if(baseTexture.hasLoaded)
    {
        if(this.noFrame)frame = new PIXI.Rectangle(0,0, baseTexture.width, baseTexture.height);
      
        this.setFrame(frame);
    }
    else
    {
        var scope = this;
        baseTexture.addEventListener('loaded', function(){ scope.onBaseTextureLoaded(); });
    }
};

PIXI.Texture.prototype.constructor = PIXI.Texture;

/**
 * Called when the base texture is loaded
 *
 * @method onBaseTextureLoaded
 * @param event
 * @private
 */
PIXI.Texture.prototype.onBaseTextureLoaded = function()
{
    var baseTexture = this.baseTexture;
    baseTexture.removeEventListener( 'loaded', this.onLoaded );

    if(this.noFrame)this.frame = new PIXI.Rectangle(0,0, baseTexture.width, baseTexture.height);
    
    this.setFrame(this.frame);

    this.scope.dispatchEvent( { type: 'update', content: this } );
};

/**
 * Destroys this texture
 *
 * @method destroy
 * @param destroyBase {Boolean} Whether to destroy the base texture as well
 */
PIXI.Texture.prototype.destroy = function(destroyBase)
{
    if(destroyBase) this.baseTexture.destroy();
};

/**
 * Specifies the rectangle region of the baseTexture
 *
 * @method setFrame
 * @param frame {Rectangle} The frame of the texture to set it to
 */
PIXI.Texture.prototype.setFrame = function(frame)
{
    this.frame = frame;
    this.width = frame.width;
    this.height = frame.height;

    if(frame.x + frame.width > this.baseTexture.width || frame.y + frame.height > this.baseTexture.height)
    {
        throw new Error('Texture Error: frame does not fit inside the base Texture dimensions ' + this);
    }

    this.updateFrame = true;

    PIXI.Texture.frameUpdates.push(this);


    //this.dispatchEvent( { type: 'update', content: this } );
};

PIXI.Texture.prototype._updateWebGLuvs = function()
{
    if(!this._uvs)this._uvs = new PIXI.TextureUvs();

    var frame = this.frame;
    var tw = this.baseTexture.width;
    var th = this.baseTexture.height;

    this._uvs.x0 = frame.x / tw;
    this._uvs.y0 = frame.y / th;

    this._uvs.x1 = (frame.x + frame.width) / tw;
    this._uvs.y1 = frame.y / th;

    this._uvs.x2 = (frame.x + frame.width) / tw;
    this._uvs.y2 = (frame.y + frame.height) / th;

    this._uvs.x3 = frame.x / tw;
    this._uvs.y3 = (frame.y + frame.height) / th;
};

/**
 * Helper function that returns a texture based on an image url
 * If the image is not in the texture cache it will be  created and loaded
 *
 * @static
 * @method fromImage
 * @param imageUrl {String} The image url of the texture
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 * @return Texture
 */
PIXI.Texture.fromImage = function(imageUrl, crossorigin, scaleMode)
{
    var texture = PIXI.TextureCache[imageUrl];

    if(!texture)
    {
        texture = new PIXI.Texture(PIXI.BaseTexture.fromImage(imageUrl, crossorigin, scaleMode));
        PIXI.TextureCache[imageUrl] = texture;
    }

    return texture;
};

/**
 * Helper function that returns a texture based on a frame id
 * If the frame id is not in the texture cache an error will be thrown
 *
 * @static
 * @method fromFrame
 * @param frameId {String} The frame id of the texture
 * @return Texture
 */
PIXI.Texture.fromFrame = function(frameId)
{
    var texture = PIXI.TextureCache[frameId];
    if(!texture) throw new Error('The frameId "' + frameId + '" does not exist in the texture cache ');
    return texture;
};

/**
 * Helper function that returns a texture based on a canvas element
 * If the canvas is not in the texture cache it will be  created and loaded
 *
 * @static
 * @method fromCanvas
 * @param canvas {Canvas} The canvas element source of the texture
 * @param scaleMode {Number} Should be one of the PIXI.scaleMode consts
 * @return Texture
 */
PIXI.Texture.fromCanvas = function(canvas, scaleMode)
{
    var baseTexture = PIXI.BaseTexture.fromCanvas(canvas, scaleMode);

    return new PIXI.Texture( baseTexture );

};


/**
 * Adds a texture to the textureCache.
 *
 * @static
 * @method addTextureToCache
 * @param texture {Texture}
 * @param id {String} the id that the texture will be stored against.
 */
PIXI.Texture.addTextureToCache = function(texture, id)
{
    PIXI.TextureCache[id] = texture;
};

/**
 * Remove a texture from the textureCache.
 *
 * @static
 * @method removeTextureFromCache
 * @param id {String} the id of the texture to be removed
 * @return {Texture} the texture that was removed
 */
PIXI.Texture.removeTextureFromCache = function(id)
{
    var texture = PIXI.TextureCache[id];
    delete PIXI.TextureCache[id];
    delete PIXI.BaseTextureCache[id];
    return texture;
};

// this is more for webGL.. it contains updated frames..
PIXI.Texture.frameUpdates = [];

PIXI.TextureUvs = function()
{
    this.x0 = 0;
    this.y0 = 0;

    this.x1 = 0;
    this.y1 = 0;

    this.x2 = 0;
    this.y2 = 0;

    this.x3 = 0;
    this.y4 = 0;


};


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 A RenderTexture is a special texture that allows any pixi displayObject to be rendered to it.

 __Hint__: All DisplayObjects (exmpl. Sprites) that render on RenderTexture should be preloaded.
 Otherwise black rectangles will be drawn instead.

 RenderTexture takes snapshot of DisplayObject passed to render method. If DisplayObject is passed to render method, position and rotation of it will be ignored. For example:

    var renderTexture = new PIXI.RenderTexture(800, 600);
    var sprite = PIXI.Sprite.fromImage("spinObj_01.png");
    sprite.position.x = 800/2;
    sprite.position.y = 600/2;
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    renderTexture.render(sprite);

 Sprite in this case will be rendered to 0,0 position. To render this sprite at center DisplayObjectContainer should be used:

    var doc = new PIXI.DisplayObjectContainer();
    doc.addChild(sprite);
    renderTexture.render(doc);  // Renders to center of renderTexture

 * @class RenderTexture
 * @extends Texture
 * @constructor
 * @param width {Number} The width of the render texture
 * @param height {Number} The height of the render texture
 */
PIXI.RenderTexture = function(width, height, renderer)
{
    PIXI.EventTarget.call( this );

    /**
     * The with of the render texture
     *
     * @property width
     * @type Number
     */
    this.width = width || 100;
    /**
     * The height of the render texture
     *
     * @property height
     * @type Number
     */
    this.height = height || 100;

    /**
     * The framing rectangle of the render texture
     *
     * @property frame
     * @type Rectangle
     */
    this.frame = new PIXI.Rectangle(0, 0, this.width, this.height);

    /**
     * The base texture object that this texture uses
     *
     * @property baseTexture
     * @type BaseTexture
     */
    this.baseTexture = new PIXI.BaseTexture();
    this.baseTexture.width = this.width;
    this.baseTexture.height = this.height;
    this.baseTexture._glTextures = [];

    this.baseTexture.hasLoaded = true;

    // each render texture can only belong to one renderer at the moment if its webGL
    this.renderer = renderer || PIXI.defaultRenderer;

    if(this.renderer.type === PIXI.WEBGL_RENDERER)
    {
        var gl = this.renderer.gl;

        this.textureBuffer = new PIXI.FilterTexture(gl, this.width, this.height);
        this.baseTexture._glTextures[gl.id] =  this.textureBuffer.texture;

        this.render = this.renderWebGL;
        this.projection = new PIXI.Point(this.width/2 , -this.height/2);
    }
    else
    {
        this.render = this.renderCanvas;
        this.textureBuffer = new PIXI.CanvasBuffer(this.width, this.height);
        this.baseTexture.source = this.textureBuffer.canvas;
    }

    PIXI.Texture.frameUpdates.push(this);


};

PIXI.RenderTexture.prototype = Object.create(PIXI.Texture.prototype);
PIXI.RenderTexture.prototype.constructor = PIXI.RenderTexture;

PIXI.RenderTexture.prototype.resize = function(width, height)
{
    this.width = width;
    this.height = height;

    this.frame.width = this.width;
    this.frame.height = this.height;

    if(this.renderer.type === PIXI.WEBGL_RENDERER)
    {
        this.projection.x = this.width / 2;
        this.projection.y = -this.height / 2;

        var gl = this.renderer.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.baseTexture._glTextures[gl.id]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  this.width,  this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    else
    {
        this.textureBuffer.resize(this.width, this.height);
    }

    PIXI.Texture.frameUpdates.push(this);
};

/**
 * This function will draw the display object to the texture.
 *
 * @method renderWebGL
 * @param displayObject {DisplayObject} The display object to render this texture on
 * @param clear {Boolean} If true the texture will be cleared before the displayObject is drawn
 * @private
 */
PIXI.RenderTexture.prototype.renderWebGL = function(displayObject, position, clear)
{
    //TOOD replace position with matrix..
    var gl = this.renderer.gl;

    gl.colorMask(true, true, true, true);

    gl.viewport(0, 0, this.width, this.height);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureBuffer.frameBuffer );

    if(clear)this.textureBuffer.clear();

    // THIS WILL MESS WITH HIT TESTING!
    var children = displayObject.children;

    //TODO -? create a new one??? dont think so!
    var originalWorldTransform = displayObject.worldTransform;
    displayObject.worldTransform = PIXI.RenderTexture.tempMatrix;
    // modify to flip...
    displayObject.worldTransform.d = -1;
    displayObject.worldTransform.ty = this.projection.y * -2;

    if(position)
    {
        displayObject.worldTransform.tx = position.x;
        displayObject.worldTransform.ty -= position.y;
    }

    for(var i=0,j=children.length; i<j; i++)
    {
        children[i].updateTransform();
    }

    // update the textures!
    PIXI.WebGLRenderer.updateTextures();

    // 
    this.renderer.renderDisplayObject(displayObject, this.projection, this.textureBuffer.frameBuffer);

    displayObject.worldTransform = originalWorldTransform;
};


/**
 * This function will draw the display object to the texture.
 *
 * @method renderCanvas
 * @param displayObject {DisplayObject} The display object to render this texture on
 * @param clear {Boolean} If true the texture will be cleared before the displayObject is drawn
 * @private
 */
PIXI.RenderTexture.prototype.renderCanvas = function(displayObject, position, clear)
{
    var children = displayObject.children;

    var originalWorldTransform = displayObject.worldTransform;

    displayObject.worldTransform = PIXI.RenderTexture.tempMatrix;

    if(position)
    {
        displayObject.worldTransform.tx = position.x;
        displayObject.worldTransform.ty = position.y;
    }

    for(var i = 0, j = children.length; i < j; i++)
    {
        children[i].updateTransform();
    }

    if(clear)this.textureBuffer.clear();

    var context = this.textureBuffer.context;

    this.renderer.renderDisplayObject(displayObject, context);

    context.setTransform(1,0,0,1,0,0);

    displayObject.worldTransform = originalWorldTransform;
};

PIXI.RenderTexture.tempMatrix = new PIXI.Matrix();


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * A Class that loads a bunch of images / sprite sheet / bitmap font files. Once the
 * assets have been loaded they are added to the PIXI Texture cache and can be accessed
 * easily through PIXI.Texture.fromImage() and PIXI.Sprite.fromImage()
 * When all items have been loaded this class will dispatch a 'onLoaded' event
 * As each individual item is loaded this class will dispatch a 'onProgress' event
 *
 * @class AssetLoader
 * @constructor
 * @uses EventTarget
 * @param {Array<String>} assetURLs an array of image/sprite sheet urls that you would like loaded
 *      supported. Supported image formats include 'jpeg', 'jpg', 'png', 'gif'. Supported
 *      sprite sheet data formats only include 'JSON' at this time. Supported bitmap font
 *      data formats include 'xml' and 'fnt'.
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.AssetLoader = function(assetURLs, crossorigin)
{
    PIXI.EventTarget.call(this);

    /**
     * The array of asset URLs that are going to be loaded
     *
     * @property assetURLs
     * @type Array<String>
     */
    this.assetURLs = assetURLs;

    /**
     * Whether the requests should be treated as cross origin
     *
     * @property crossorigin
     * @type Boolean
     */
    this.crossorigin = crossorigin;

    /**
     * Maps file extension to loader types
     *
     * @property loadersByType
     * @type Object
     */
    this.loadersByType = {
        'jpg':  PIXI.ImageLoader,
        'jpeg': PIXI.ImageLoader,
        'png':  PIXI.ImageLoader,
        'gif':  PIXI.ImageLoader,
        'json': PIXI.JsonLoader,
        'atlas': PIXI.AtlasLoader,
        'anim': PIXI.SpineLoader,
        'xml':  PIXI.BitmapFontLoader,
        'fnt':  PIXI.BitmapFontLoader
    };
};

/**
 * Fired when an item has loaded
 * @event onProgress
 */

/**
 * Fired when all the assets have loaded
 * @event onComplete
 */

// constructor
PIXI.AssetLoader.prototype.constructor = PIXI.AssetLoader;

/**
 * Given a filename, returns its extension, wil
 *
 * @method _getDataType
 * @param str {String} the name of the asset
 */
PIXI.AssetLoader.prototype._getDataType = function(str)
{
    var test = 'data:';
    //starts with 'data:'
    var start = str.slice(0, test.length).toLowerCase();
    if (start === test) {
        var data = str.slice(test.length);

        var sepIdx = data.indexOf(',');
        if (sepIdx === -1) //malformed data URI scheme
            return null;

        //e.g. 'image/gif;base64' => 'image/gif'
        var info = data.slice(0, sepIdx).split(';')[0];

        //We might need to handle some special cases here...
        //standardize text/plain to 'txt' file extension
        if (!info || info.toLowerCase() === 'text/plain')
            return 'txt';

        //User specified mime type, try splitting it by '/'
        return info.split('/').pop().toLowerCase();
    }

    return null;
};

/**
 * Starts loading the assets sequentially
 *
 * @method load
 */
PIXI.AssetLoader.prototype.load = function()
{
    var scope = this;

    function onLoad(evt) {
        scope.onAssetLoaded(evt.content);
    }

    this.loadCount = this.assetURLs.length;

    for (var i=0; i < this.assetURLs.length; i++)
    {
        var fileName = this.assetURLs[i];
        //first see if we have a data URI scheme..
        var fileType = this._getDataType(fileName);

        //if not, assume it's a file URI
        if (!fileType)
            fileType = fileName.split('?').shift().split('.').pop().toLowerCase();

        var Constructor = this.loadersByType[fileType];
        if(!Constructor)
            throw new Error(fileType + ' is an unsupported file type');

        var loader = new Constructor(fileName, this.crossorigin);

        loader.addEventListener('loaded', onLoad);
        loader.load();
    }
};

/**
 * Invoked after each file is loaded
 *
 * @method onAssetLoaded
 * @private
 */
PIXI.AssetLoader.prototype.onAssetLoaded = function(loader)
{
    this.loadCount--;
    this.dispatchEvent({ type: 'onProgress', content: this, loader: loader });
    if (this.onProgress) this.onProgress(loader);

    if (!this.loadCount)
    {
        this.dispatchEvent({type: 'onComplete', content: this});
        if(this.onComplete) this.onComplete();
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The json file loader is used to load in JSON data and parse it
 * When loaded this class will dispatch a 'loaded' event
 * If loading fails this class will dispatch an 'error' event
 *
 * @class JsonLoader
 * @uses EventTarget
 * @constructor
 * @param url {String} The url of the JSON file
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.JsonLoader = function (url, crossorigin) {
    PIXI.EventTarget.call(this);

    /**
     * The url of the bitmap font data
     *
     * @property url
     * @type String
     */
    this.url = url;

    /**
     * Whether the requests should be treated as cross origin
     *
     * @property crossorigin
     * @type Boolean
     */
    this.crossorigin = crossorigin;

    /**
     * [read-only] The base url of the bitmap font data
     *
     * @property baseUrl
     * @type String
     * @readOnly
     */
    this.baseUrl = url.replace(/[^\/]*$/, '');

    /**
     * [read-only] Whether the data has loaded yet
     *
     * @property loaded
     * @type Boolean
     * @readOnly
     */
    this.loaded = false;

};

// constructor
PIXI.JsonLoader.prototype.constructor = PIXI.JsonLoader;

/**
 * Loads the JSON data
 *
 * @method load
 */
PIXI.JsonLoader.prototype.load = function () {


    if(window.XDomainRequest)
    {
        this.ajaxRequest = new window.XDomainRequest();
    }
    else if (window.XMLHttpRequest)
    {
        this.ajaxRequest = new window.XMLHttpRequest();
    }
    else
    {
        this.ajaxRequest = new window.ActiveXObject('Microsoft.XMLHTTP');
    }

    


   // this.ajaxRequest = new PIXI.AjaxRequest(this.crossorigin);
    var scope = this;
    

    

    this.ajaxRequest.onload = function () {
        scope.onJSONLoaded();
    };

   // this.ajaxRequest.open('GET', this.url, true);
  //  if (this.ajaxRequest.overrideMimeType) this.ajaxRequest.overrideMimeType('application/json');
  //  this.ajaxRequest.send(null);

    this.ajaxRequest.open('GET',this.url,false);
    this.ajaxRequest.send();
};

/**
 * Invoke when JSON file is loaded
 *
 * @method onJSONLoaded
 * @private
 */
PIXI.JsonLoader.prototype.onJSONLoaded = function () {
   // if (this.ajaxRequest.readyState === 4) {
     //   if (this.ajaxRequest.status === 200 || window.location.protocol.indexOf('http') === -1) {
    this.json = JSON.parse(this.ajaxRequest.responseText);

    if(this.json.frames)
    {
        // sprite sheet
        var scope = this;
        var textureUrl = this.baseUrl + this.json.meta.image;
        var image = new PIXI.ImageLoader(textureUrl, this.crossorigin);
        var frameData = this.json.frames;

        this.texture = image.texture.baseTexture;
        image.addEventListener('loaded', function() {
            scope.onLoaded();
        });

        for (var i in frameData) {
            var rect = frameData[i].frame;
            if (rect) {
                PIXI.TextureCache[i] = new PIXI.Texture(this.texture, {
                    x: rect.x,
                    y: rect.y,
                    width: rect.w,
                    height: rect.h
                });

                // check to see ifthe sprite ha been trimmed..
                if (frameData[i].trimmed) {

                    var texture =  PIXI.TextureCache[i];
                    
                    var actualSize = frameData[i].sourceSize;
                    var realSize = frameData[i].spriteSourceSize;

                    texture.trim = new PIXI.Rectangle(realSize.x, realSize.y, actualSize.w, actualSize.h);
                }
            }
        }

        image.load();

    }
    else if(this.json.bones)
    {
        // spine animation
        var spineJsonParser = new spine.SkeletonJson();
        var skeletonData = spineJsonParser.readSkeletonData(this.json);
        PIXI.AnimCache[this.url] = skeletonData;
        this.onLoaded();
    }
    else
    {
        this.onLoaded();
    }
     //   }
      //  else
        //{
          //  this.onError();
       // / }
   // }
};

/**
 * Invoke when json file loaded
 *
 * @method onLoaded
 * @private
 */
PIXI.JsonLoader.prototype.onLoaded = function () {
    this.loaded = true;
    this.dispatchEvent({
        type: 'loaded',
        content: this
    });
};

/**
 * Invoke when error occured
 *
 * @method onError
 * @private
 */
PIXI.JsonLoader.prototype.onError = function () {
    this.dispatchEvent({
        type: 'error',
        content: this
    });
};
/**
 * @author Martin Kelm http://mkelm.github.com
 */

/**
 * The atlas file loader is used to load in Atlas data and parse it
 * When loaded this class will dispatch a 'loaded' event
 * If loading fails this class will dispatch an 'error' event
 * @class AtlasLoader
 * @extends EventTarget
 * @constructor
 * @param {String} url the url of the JSON file
 * @param {Boolean} crossorigin
 */

PIXI.AtlasLoader = function (url, crossorigin) {
    PIXI.EventTarget.call(this);
    this.url = url;
    this.baseUrl = url.replace(/[^\/]*$/, '');
    this.crossorigin = crossorigin;
    this.loaded = false;

};

// constructor
PIXI.AtlasLoader.constructor = PIXI.AtlasLoader;


 /**
 * Starts loading the JSON file
 *
 * @method load
 */
PIXI.AtlasLoader.prototype.load = function () {
    this.ajaxRequest = new PIXI.AjaxRequest();
    this.ajaxRequest.onreadystatechange = this.onAtlasLoaded.bind(this);

    this.ajaxRequest.open('GET', this.url, true);
    if (this.ajaxRequest.overrideMimeType) this.ajaxRequest.overrideMimeType('application/json');
    this.ajaxRequest.send(null);
};

/**
 * Invoke when JSON file is loaded
 * @method onAtlasLoaded
 * @private
 */
PIXI.AtlasLoader.prototype.onAtlasLoaded = function () {
    if (this.ajaxRequest.readyState === 4) {
        if (this.ajaxRequest.status === 200 || window.location.href.indexOf('http') === -1) {
            this.atlas = {
                meta : {
                    image : []
                },
                frames : []
            };
            var result = this.ajaxRequest.responseText.split(/\r?\n/);
            var lineCount = -3;

            var currentImageId = 0;
            var currentFrame = null;
            var nameInNextLine = false;

            var i = 0,
                j = 0,
                selfOnLoaded = this.onLoaded.bind(this);

            // parser without rotation support yet!
            for (i = 0; i < result.length; i++) {
                result[i] = result[i].replace(/^\s+|\s+$/g, '');
                if (result[i] === '') {
                    nameInNextLine = i+1;
                }
                if (result[i].length > 0) {
                    if (nameInNextLine === i) {
                        this.atlas.meta.image.push(result[i]);
                        currentImageId = this.atlas.meta.image.length - 1;
                        this.atlas.frames.push({});
                        lineCount = -3;
                    } else if (lineCount > 0) {
                        if (lineCount % 7 === 1) { // frame name
                            if (currentFrame != null) { //jshint ignore:line
                                this.atlas.frames[currentImageId][currentFrame.name] = currentFrame;
                            }
                            currentFrame = { name: result[i], frame : {} };
                        } else {
                            var text = result[i].split(' ');
                            if (lineCount % 7 === 3) { // position
                                currentFrame.frame.x = Number(text[1].replace(',', ''));
                                currentFrame.frame.y = Number(text[2]);
                            } else if (lineCount % 7 === 4) { // size
                                currentFrame.frame.w = Number(text[1].replace(',', ''));
                                currentFrame.frame.h = Number(text[2]);
                            } else if (lineCount % 7 === 5) { // real size
                                var realSize = {
                                    x : 0,
                                    y : 0,
                                    w : Number(text[1].replace(',', '')),
                                    h : Number(text[2])
                                };

                                if (realSize.w > currentFrame.frame.w || realSize.h > currentFrame.frame.h) {
                                    currentFrame.trimmed = true;
                                    currentFrame.realSize = realSize;
                                } else {
                                    currentFrame.trimmed = false;
                                }
                            }
                        }
                    }
                    lineCount++;
                }
            }

            if (currentFrame != null) { //jshint ignore:line
                this.atlas.frames[currentImageId][currentFrame.name] = currentFrame;
            }

            if (this.atlas.meta.image.length > 0) {
                this.images = [];
                for (j = 0; j < this.atlas.meta.image.length; j++) {
                    // sprite sheet
                    var textureUrl = this.baseUrl + this.atlas.meta.image[j];
                    var frameData = this.atlas.frames[j];
                    this.images.push(new PIXI.ImageLoader(textureUrl, this.crossorigin));

                    for (i in frameData) {
                        var rect = frameData[i].frame;
                        if (rect) {
                            PIXI.TextureCache[i] = new PIXI.Texture(this.images[j].texture.baseTexture, {
                                x: rect.x,
                                y: rect.y,
                                width: rect.w,
                                height: rect.h
                            });
                            if (frameData[i].trimmed) {
                                PIXI.TextureCache[i].realSize = frameData[i].realSize;
                                // trim in pixi not supported yet, todo update trim properties if it is done ...
                                PIXI.TextureCache[i].trim.x = 0;
                                PIXI.TextureCache[i].trim.y = 0;
                            }
                        }
                    }
                }

                this.currentImageId = 0;
                for (j = 0; j < this.images.length; j++) {
                    this.images[j].addEventListener('loaded', selfOnLoaded);
                }
                this.images[this.currentImageId].load();

            } else {
                this.onLoaded();
            }

        } else {
            this.onError();
        }
    }
};

/**
 * Invoke when json file has loaded
 * @method onLoaded
 * @private
 */
PIXI.AtlasLoader.prototype.onLoaded = function () {
    if (this.images.length - 1 > this.currentImageId) {
        this.currentImageId++;
        this.images[this.currentImageId].load();
    } else {
        this.loaded = true;
        this.dispatchEvent({
            type: 'loaded',
            content: this
        });
    }
};

/**
 * Invoke when error occured
 * @method onError
 * @private
 */
PIXI.AtlasLoader.prototype.onError = function () {
    this.dispatchEvent({
        type: 'error',
        content: this
    });
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The sprite sheet loader is used to load in JSON sprite sheet data
 * To generate the data you can use http://www.codeandweb.com/texturepacker and publish in the 'JSON' format
 * There is a free version so thats nice, although the paid version is great value for money.
 * It is highly recommended to use Sprite sheets (also know as a 'texture atlas') as it means sprites can be batched and drawn together for highly increased rendering speed.
 * Once the data has been loaded the frames are stored in the PIXI texture cache and can be accessed though PIXI.Texture.fromFrameId() and PIXI.Sprite.fromFrameId()
 * This loader will load the image file that the Spritesheet points to as well as the data.
 * When loaded this class will dispatch a 'loaded' event
 *
 * @class SpriteSheetLoader
 * @uses EventTarget
 * @constructor
 * @param url {String} The url of the sprite sheet JSON file
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.SpriteSheetLoader = function (url, crossorigin) {
    /*
     * i use texture packer to load the assets..
     * http://www.codeandweb.com/texturepacker
     * make sure to set the format as 'JSON'
     */
    PIXI.EventTarget.call(this);

    /**
     * The url of the bitmap font data
     *
     * @property url
     * @type String
     */
    this.url = url;

    /**
     * Whether the requests should be treated as cross origin
     *
     * @property crossorigin
     * @type Boolean
     */
    this.crossorigin = crossorigin;

    /**
     * [read-only] The base url of the bitmap font data
     *
     * @property baseUrl
     * @type String
     * @readOnly
     */
    this.baseUrl = url.replace(/[^\/]*$/, '');

    /**
     * The texture being loaded
     *
     * @property texture
     * @type Texture
     */
    this.texture = null;

    /**
     * The frames of the sprite sheet
     *
     * @property frames
     * @type Object
     */
    this.frames = {};
};

// constructor
PIXI.SpriteSheetLoader.prototype.constructor = PIXI.SpriteSheetLoader;

/**
 * This will begin loading the JSON file
 *
 * @method load
 */
PIXI.SpriteSheetLoader.prototype.load = function () {
    var scope = this;
    var jsonLoader = new PIXI.JsonLoader(this.url, this.crossorigin);
    jsonLoader.addEventListener('loaded', function (event) {
        scope.json = event.content.json;
        scope.onLoaded();
    });
    jsonLoader.load();
};

/**
 * Invoke when all files are loaded (json and texture)
 *
 * @method onLoaded
 * @private
 */
PIXI.SpriteSheetLoader.prototype.onLoaded = function () {
    this.dispatchEvent({
        type: 'loaded',
        content: this
    });
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The image loader class is responsible for loading images file formats ('jpeg', 'jpg', 'png' and 'gif')
 * Once the image has been loaded it is stored in the PIXI texture cache and can be accessed though PIXI.Texture.fromFrameId() and PIXI.Sprite.fromFrameId()
 * When loaded this class will dispatch a 'loaded' event
 *
 * @class ImageLoader
 * @uses EventTarget
 * @constructor
 * @param url {String} The url of the image
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.ImageLoader = function(url, crossorigin)
{
    PIXI.EventTarget.call(this);

    /**
     * The texture being loaded
     *
     * @property texture
     * @type Texture
     */
    this.texture = PIXI.Texture.fromImage(url, crossorigin);

    /**
     * if the image is loaded with loadFramedSpriteSheet
     * frames will contain the sprite sheet frames
     *
     */
    this.frames = [];
};

// constructor
PIXI.ImageLoader.prototype.constructor = PIXI.ImageLoader;

/**
 * Loads image or takes it from cache
 *
 * @method load
 */
PIXI.ImageLoader.prototype.load = function()
{
    if(!this.texture.baseTexture.hasLoaded)
    {
        var scope = this;
        this.texture.baseTexture.addEventListener('loaded', function()
        {
            scope.onLoaded();
        });
    }
    else
    {
        this.onLoaded();
    }
};

/**
 * Invoked when image file is loaded or it is already cached and ready to use
 *
 * @method onLoaded
 * @private
 */
PIXI.ImageLoader.prototype.onLoaded = function()
{
    this.dispatchEvent({type: 'loaded', content: this});
};

/**
 * Loads image and split it to uniform sized frames
 *
 *
 * @method loadFramedSpriteSheet
 * @param frameWidth {Number} width of each frame
 * @param frameHeight {Number} height of each frame
 * @param textureName {String} if given, the frames will be cached in <textureName>-<ord> format
 */
PIXI.ImageLoader.prototype.loadFramedSpriteSheet = function(frameWidth, frameHeight, textureName)
{
    this.frames = [];
    var cols = Math.floor(this.texture.width / frameWidth);
    var rows = Math.floor(this.texture.height / frameHeight);

    var i=0;
    for (var y=0; y<rows; y++)
    {
        for (var x=0; x<cols; x++,i++)
        {
            var texture = new PIXI.Texture(this.texture, {
                x: x*frameWidth,
                y: y*frameHeight,
                width: frameWidth,
                height: frameHeight
            });

            this.frames.push(texture);
            if (textureName) PIXI.TextureCache[textureName + '-' + i] = texture;
        }
    }

    if(!this.texture.baseTexture.hasLoaded)
    {
        var scope = this;
        this.texture.baseTexture.addEventListener('loaded', function() {
            scope.onLoaded();
        });
    }
    else
    {
        this.onLoaded();
    }
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * The xml loader is used to load in XML bitmap font data ('xml' or 'fnt')
 * To generate the data you can use http://www.angelcode.com/products/bmfont/
 * This loader will also load the image file as the data.
 * When loaded this class will dispatch a 'loaded' event
 *
 * @class BitmapFontLoader
 * @uses EventTarget
 * @constructor
 * @param url {String} The url of the sprite sheet JSON file
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.BitmapFontLoader = function(url, crossorigin)
{
    /*
     * I use texture packer to load the assets..
     * http://www.codeandweb.com/texturepacker
     * make sure to set the format as 'JSON'
     */
    PIXI.EventTarget.call(this);

    /**
     * The url of the bitmap font data
     *
     * @property url
     * @type String
     */
    this.url = url;

    /**
     * Whether the requests should be treated as cross origin
     *
     * @property crossorigin
     * @type Boolean
     */
    this.crossorigin = crossorigin;

    /**
     * [read-only] The base url of the bitmap font data
     *
     * @property baseUrl
     * @type String
     * @readOnly
     */
    this.baseUrl = url.replace(/[^\/]*$/, '');

    /**
     * [read-only] The texture of the bitmap font
     *
     * @property baseUrl
     * @type String
     */
    this.texture = null;
};

// constructor
PIXI.BitmapFontLoader.prototype.constructor = PIXI.BitmapFontLoader;

/**
 * Loads the XML font data
 *
 * @method load
 */
PIXI.BitmapFontLoader.prototype.load = function()
{
    this.ajaxRequest = new PIXI.AjaxRequest();
    var scope = this;
    this.ajaxRequest.onreadystatechange = function()
    {
        scope.onXMLLoaded();
    };

    this.ajaxRequest.open('GET', this.url, true);
    if (this.ajaxRequest.overrideMimeType) this.ajaxRequest.overrideMimeType('application/xml');
    this.ajaxRequest.send(null);
};

/**
 * Invoked when the XML file is loaded, parses the data
 *
 * @method onXMLLoaded
 * @private
 */
PIXI.BitmapFontLoader.prototype.onXMLLoaded = function()
{
    if (this.ajaxRequest.readyState === 4)
    {
        if (this.ajaxRequest.status === 200 || window.location.protocol.indexOf('http') === -1)
        {
            var responseXML = this.ajaxRequest.responseXML;
            if(!responseXML || /MSIE 9/i.test(navigator.userAgent) || navigator.isCocoonJS) {
                if(typeof(window.DOMParser) === 'function') {
                    var domparser = new DOMParser();
                    responseXML = domparser.parseFromString(this.ajaxRequest.responseText, 'text/xml');
                } else {
                    var div = document.createElement('div');
                    div.innerHTML = this.ajaxRequest.responseText;
                    responseXML = div;
                }
            }

            var textureUrl = this.baseUrl + responseXML.getElementsByTagName('page')[0].getAttribute('file');
            var image = new PIXI.ImageLoader(textureUrl, this.crossorigin);
            this.texture = image.texture.baseTexture;

            var data = {};
            var info = responseXML.getElementsByTagName('info')[0];
            var common = responseXML.getElementsByTagName('common')[0];
            data.font = info.getAttribute('face');
            data.size = parseInt(info.getAttribute('size'), 10);
            data.lineHeight = parseInt(common.getAttribute('lineHeight'), 10);
            data.chars = {};

            //parse letters
            var letters = responseXML.getElementsByTagName('char');

            for (var i = 0; i < letters.length; i++)
            {
                var charCode = parseInt(letters[i].getAttribute('id'), 10);

                var textureRect = new PIXI.Rectangle(
                    parseInt(letters[i].getAttribute('x'), 10),
                    parseInt(letters[i].getAttribute('y'), 10),
                    parseInt(letters[i].getAttribute('width'), 10),
                    parseInt(letters[i].getAttribute('height'), 10)
                );

                data.chars[charCode] = {
                    xOffset: parseInt(letters[i].getAttribute('xoffset'), 10),
                    yOffset: parseInt(letters[i].getAttribute('yoffset'), 10),
                    xAdvance: parseInt(letters[i].getAttribute('xadvance'), 10),
                    kerning: {},
                    texture: PIXI.TextureCache[charCode] = new PIXI.Texture(this.texture, textureRect)

                };
            }

            //parse kernings
            var kernings = responseXML.getElementsByTagName('kerning');
            for (i = 0; i < kernings.length; i++)
            {
                var first = parseInt(kernings[i].getAttribute('first'), 10);
                var second = parseInt(kernings[i].getAttribute('second'), 10);
                var amount = parseInt(kernings[i].getAttribute('amount'), 10);

                data.chars[second].kerning[first] = amount;

            }

            PIXI.BitmapText.fonts[data.font] = data;

            var scope = this;
            image.addEventListener('loaded', function() {
                scope.onLoaded();
            });
            image.load();
        }
    }
};

/**
 * Invoked when all files are loaded (xml/fnt and texture)
 *
 * @method onLoaded
 * @private
 */
PIXI.BitmapFontLoader.prototype.onLoaded = function()
{
    this.dispatchEvent({type: 'loaded', content: this});
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * based on pixi impact spine implementation made by Eemeli Kelokorpi (@ekelokorpi) https://github.com/ekelokorpi
 *
 * Awesome JS run time provided by EsotericSoftware
 * https://github.com/EsotericSoftware/spine-runtimes
 *
 */

/**
 * The Spine loader is used to load in JSON spine data
 * To generate the data you need to use http://esotericsoftware.com/ and export in the "JSON" format
 * Due to a clash of names  You will need to change the extension of the spine file from *.json to *.anim for it to load
 * See example 12 (http://www.goodboydigital.com/pixijs/examples/12/) to see a working example and check out the source
 * You will need to generate a sprite sheet to accompany the spine data
 * When loaded this class will dispatch a "loaded" event
 *
 * @class Spine
 * @uses EventTarget
 * @constructor
 * @param url {String} The url of the JSON file
 * @param crossorigin {Boolean} Whether requests should be treated as crossorigin
 */
PIXI.SpineLoader = function(url, crossorigin)
{
    PIXI.EventTarget.call(this);

    /**
     * The url of the bitmap font data
     *
     * @property url
     * @type String
     */
    this.url = url;

    /**
     * Whether the requests should be treated as cross origin
     *
     * @property crossorigin
     * @type Boolean
     */
    this.crossorigin = crossorigin;

    /**
     * [read-only] Whether the data has loaded yet
     *
     * @property loaded
     * @type Boolean
     * @readOnly
     */
    this.loaded = false;
};

PIXI.SpineLoader.prototype.constructor = PIXI.SpineLoader;

/**
 * Loads the JSON data
 *
 * @method load
 */
PIXI.SpineLoader.prototype.load = function () {

    var scope = this;
    var jsonLoader = new PIXI.JsonLoader(this.url, this.crossorigin);
    jsonLoader.addEventListener("loaded", function (event) {
        scope.json = event.content.json;
        scope.onLoaded();
    });
    jsonLoader.load();
};

/**
 * Invoke when JSON file is loaded
 *
 * @method onLoaded
 * @private
 */
PIXI.SpineLoader.prototype.onLoaded = function () {
    this.loaded = true;
    this.dispatchEvent({type: "loaded", content: this});
};


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 * This is the base class for creating a pixi.js filter. Currently only webGL supports filters.
 * If you want to make a custom filter this should be your base class.
 * @class AbstractFilter
 * @constructor
 * @param fragmentSrc
 * @param uniforms
 */
PIXI.AbstractFilter = function(fragmentSrc, uniforms)
{
    /**
    * An array of passes - some filters contain a few steps this array simply stores the steps in a liniear fashion.
    * For example the blur filter has two passes blurX and blurY.
    * @property passes
    * @type Array an array of filter objects
    * @private
    */
    this.passes = [this];

    /**
    * @property shaders
    * @type Array an array of shaders
    * @private
    */
    this.shaders = [];
    
    this.dirty = true;
    this.padding = 0;

    /**
    * @property uniforms
    * @type object
    * @private
    */
    this.uniforms = uniforms || {};
    /**
    * @property fragmentSrc
    * @type Array
    * @private
    */
    this.fragmentSrc = fragmentSrc || [];
};

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * The AlphaMaskFilter class uses the pixel values from the specified texture (called the displacement map) to perform a displacement of an object.
 * You can use this filter to apply all manor of crazy warping effects
 * Currently the r property of the texture is used to offset the x and the g propery of the texture is used to offset the y.
 * @class AlphaMaskFilter
 * @contructor
 * @param texture {Texture} The texture used for the displacemtent map * must be power of 2 texture at the moment
 */
PIXI.AlphaMaskFilter = function(texture)
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];
    texture.baseTexture._powerOf2 = true;

    // set the uniforms
    this.uniforms = {
        mask: {type: 'sampler2D', value:texture},
        mapDimensions:   {type: '2f', value:{x:1, y:5112}},
        dimensions:   {type: '4fv', value:[0,0,0,0]}
    };

    if(texture.baseTexture.hasLoaded)
    {
        this.uniforms.mask.value.x = texture.width;
        this.uniforms.mask.value.y = texture.height;
    }
    else
    {
        this.boundLoadedFunction = this.onTextureLoaded.bind(this);

        texture.baseTexture.on('loaded', this.boundLoadedFunction);
    }

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D mask;',
        'uniform sampler2D uSampler;',
        'uniform vec2 offset;',
        'uniform vec4 dimensions;',
        'uniform vec2 mapDimensions;',

        'void main(void) {',
        '   vec2 mapCords = vTextureCoord.xy;',
        '   mapCords += (dimensions.zw + offset)/ dimensions.xy ;',
        '   mapCords.y *= -1.0;',
        '   mapCords.y += 1.0;',
        '   mapCords *= dimensions.xy / mapDimensions;',

        '   vec4 original =  texture2D(uSampler, vTextureCoord);',
        '   float maskAlpha =  texture2D(mask, mapCords).r;',
        '   original *= maskAlpha;',
        //'   original.rgb *= maskAlpha;',
        '   gl_FragColor =  original;',
        //'   gl_FragColor = gl_FragColor;',
        '}'
    ];
};

PIXI.AlphaMaskFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.AlphaMaskFilter.prototype.constructor = PIXI.AlphaMaskFilter;

PIXI.AlphaMaskFilter.prototype.onTextureLoaded = function()
{
    this.uniforms.mapDimensions.value.x = this.uniforms.mask.value.width;
    this.uniforms.mapDimensions.value.y = this.uniforms.mask.value.height;

    this.uniforms.mask.value.baseTexture.off('loaded', this.boundLoadedFunction);
};

/**
 * The texture used for the displacemtent map * must be power of 2 texture at the moment
 *
 * @property map
 * @type Texture
 */
Object.defineProperty(PIXI.AlphaMaskFilter.prototype, 'map', {
    get: function() {
        return this.uniforms.mask.value;
    },
    set: function(value) {
        this.uniforms.mask.value = value;
    }
});


/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * The ColorMatrixFilter class lets you apply a 4x4 matrix transformation on the RGBA
 * color and alpha values of every pixel on your displayObject to produce a result
 * with a new set of RGBA color and alpha values. Its pretty powerful!
 * @class ColorMatrixFilter
 * @contructor
 */
PIXI.ColorMatrixFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        matrix: {type: 'mat4', value: [1,0,0,0,
                                       0,1,0,0,
                                       0,0,1,0,
                                       0,0,0,1]},
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float invert;',
        'uniform mat4 matrix;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord) * matrix;',
      //  '   gl_FragColor = gl_FragColor;',
        '}'
    ];
};

PIXI.ColorMatrixFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.ColorMatrixFilter.prototype.constructor = PIXI.ColorMatrixFilter;

/**
 * Sets the matrix of the color matrix filter
 *
 * @property matrix
 * @type Array and array of 26 numbers
 * @default [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
 */
Object.defineProperty(PIXI.ColorMatrixFilter.prototype, 'matrix', {
    get: function() {
        return this.uniforms.matrix.value;
    },
    set: function(value) {
        this.uniforms.matrix.value = value;
    }
});
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This turns your displayObjects to black and white.
 * @class GrayFilter
 * @contructor
 */
PIXI.GrayFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        gray: {type: '1f', value: 1},
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D uSampler;',
        'uniform float gray;',

        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord);',
        '   gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.2126*gl_FragColor.r + 0.7152*gl_FragColor.g + 0.0722*gl_FragColor.b), gray);',
     //   '   gl_FragColor = gl_FragColor;',
        '}'
    ];
};

PIXI.GrayFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.GrayFilter.prototype.constructor = PIXI.GrayFilter;

/**
The strength of the gray. 1 will make the object black and white, 0 will make the object its normal color
@property gray
*/
Object.defineProperty(PIXI.GrayFilter.prototype, 'gray', {
    get: function() {
        return this.uniforms.gray.value;
    },
    set: function(value) {
        this.uniforms.gray.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * The DisplacementFilter class uses the pixel values from the specified texture (called the displacement map) to perform a displacement of an object.
 * You can use this filter to apply all manor of crazy warping effects
 * Currently the r property of the texture is used offset the x and the g propery of the texture is used to offset the y.
 * @class DisplacementFilter
 * @contructor
 * @param texture {Texture} The texture used for the displacemtent map * must be power of 2 texture at the moment
 */
PIXI.DisplacementFilter = function(texture)
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];
    texture.baseTexture._powerOf2 = true;

    // set the uniforms
    this.uniforms = {
        displacementMap: {type: 'sampler2D', value:texture},
        scale:           {type: '2f', value:{x:30, y:30}},
        offset:          {type: '2f', value:{x:0, y:0}},
        mapDimensions:   {type: '2f', value:{x:1, y:5112}},
        dimensions:   {type: '4fv', value:[0,0,0,0]}
    };

    if(texture.baseTexture.hasLoaded)
    {
        this.uniforms.mapDimensions.value.x = texture.width;
        this.uniforms.mapDimensions.value.y = texture.height;
    }
    else
    {
        this.boundLoadedFunction = this.onTextureLoaded.bind(this);

        texture.baseTexture.on('loaded', this.boundLoadedFunction);
    }

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D displacementMap;',
        'uniform sampler2D uSampler;',
        'uniform vec2 scale;',
        'uniform vec2 offset;',
        'uniform vec4 dimensions;',
        'uniform vec2 mapDimensions;',// = vec2(256.0, 256.0);',
        // 'const vec2 textureDimensions = vec2(750.0, 750.0);',

        'void main(void) {',
        '   vec2 mapCords = vTextureCoord.xy;',
        //'   mapCords -= ;',
        '   mapCords += (dimensions.zw + offset)/ dimensions.xy ;',
        '   mapCords.y *= -1.0;',
        '   mapCords.y += 1.0;',
        '   vec2 matSample = texture2D(displacementMap, mapCords).xy;',
        '   matSample -= 0.5;',
        '   matSample *= scale;',
        '   matSample /= mapDimensions;',
        '   gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x + matSample.x, vTextureCoord.y + matSample.y));',
        '   gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb, 1.0);',
        '   vec2 cord = vTextureCoord;',

        //'   gl_FragColor =  texture2D(displacementMap, cord);',
     //   '   gl_FragColor = gl_FragColor;',
        '}'
    ];
};

PIXI.DisplacementFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.DisplacementFilter.prototype.constructor = PIXI.DisplacementFilter;

PIXI.DisplacementFilter.prototype.onTextureLoaded = function()
{
    this.uniforms.mapDimensions.value.x = this.uniforms.displacementMap.value.width;
    this.uniforms.mapDimensions.value.y = this.uniforms.displacementMap.value.height;

    this.uniforms.displacementMap.value.baseTexture.off('loaded', this.boundLoadedFunction);
};

/**
 * The texture used for the displacemtent map * must be power of 2 texture at the moment
 *
 * @property map
 * @type Texture
 */
Object.defineProperty(PIXI.DisplacementFilter.prototype, 'map', {
    get: function() {
        return this.uniforms.displacementMap.value;
    },
    set: function(value) {
        this.uniforms.displacementMap.value = value;
    }
});

/**
 * The multiplier used to scale the displacement result from the map calculation.
 *
 * @property scale
 * @type Point
 */
Object.defineProperty(PIXI.DisplacementFilter.prototype, 'scale', {
    get: function() {
        return this.uniforms.scale.value;
    },
    set: function(value) {
        this.uniforms.scale.value = value;
    }
});

/**
 * The offset used to move the displacement map.
 *
 * @property offset
 * @type Point
 */
Object.defineProperty(PIXI.DisplacementFilter.prototype, 'offset', {
    get: function() {
        return this.uniforms.offset.value;
    },
    set: function(value) {
        this.uniforms.offset.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This filter applies a pixelate effect making display objects appear 'blocky'
 * @class PixelateFilter
 * @contructor
 */
PIXI.PixelateFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        invert: {type: '1f', value: 0},
        dimensions: {type: '4fv', value:new Float32Array([10000, 100, 10, 10])},
        pixelSize: {type: '2f', value:{x:10, y:10}},
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform vec2 testDim;',
        'uniform vec4 dimensions;',
        'uniform vec2 pixelSize;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   vec2 coord = vTextureCoord;',

        '   vec2 size = dimensions.xy/pixelSize;',

        '   vec2 color = floor( ( vTextureCoord * size ) ) / size + pixelSize/dimensions.xy * 0.5;',
        '   gl_FragColor = texture2D(uSampler, color);',
        '}'
    ];
};

PIXI.PixelateFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.PixelateFilter.prototype.constructor = PIXI.PixelateFilter;

/**
 *
 * This a point that describes the size of the blocs. x is the width of the block and y is the the height
 * @property size
 * @type Point
 */
Object.defineProperty(PIXI.PixelateFilter.prototype, 'size', {
    get: function() {
        return this.uniforms.pixelSize.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.pixelSize.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.BlurXFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        blur: {type: '1f', value: 1/512},
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float blur;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   vec4 sum = vec4(0.0);',

        '   sum += texture2D(uSampler, vec2(vTextureCoord.x - 4.0*blur, vTextureCoord.y)) * 0.05;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x - 3.0*blur, vTextureCoord.y)) * 0.09;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x - 2.0*blur, vTextureCoord.y)) * 0.12;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x - blur, vTextureCoord.y)) * 0.15;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y)) * 0.16;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x + blur, vTextureCoord.y)) * 0.15;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x + 2.0*blur, vTextureCoord.y)) * 0.12;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x + 3.0*blur, vTextureCoord.y)) * 0.09;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x + 4.0*blur, vTextureCoord.y)) * 0.05;',

        '   gl_FragColor = sum;',
        '}'
    ];
};

PIXI.BlurXFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.BlurXFilter.prototype.constructor = PIXI.BlurXFilter;

Object.defineProperty(PIXI.BlurXFilter.prototype, 'blur', {
    get: function() {
        return this.uniforms.blur.value / (1/7000);
    },
    set: function(value) {

        this.dirty = true;
        this.uniforms.blur.value = (1/7000) * value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.BlurYFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        blur: {type: '1f', value: 1/512},
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float blur;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   vec4 sum = vec4(0.0);',

        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 4.0*blur)) * 0.05;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 3.0*blur)) * 0.09;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - 2.0*blur)) * 0.12;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y - blur)) * 0.15;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y)) * 0.16;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + blur)) * 0.15;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 2.0*blur)) * 0.12;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 3.0*blur)) * 0.09;',
        '   sum += texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + 4.0*blur)) * 0.05;',

        '   gl_FragColor = sum;',
        '}'
    ];
};

PIXI.BlurYFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.BlurYFilter.prototype.constructor = PIXI.BlurYFilter;

Object.defineProperty(PIXI.BlurYFilter.prototype, 'blur', {
    get: function() {
        return this.uniforms.blur.value / (1/7000);
    },
    set: function(value) {
        //this.padding = value;
        this.uniforms.blur.value = (1/7000) * value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * The BlurFilter applies a Gaussian blur to an object.
 * The strength of the blur can be set for x- and y-axis separately (always relative to the stage).
 *
 * @class BlurFilter
 * @contructor
 */
PIXI.BlurFilter = function()
{
    this.blurXFilter = new PIXI.BlurXFilter();
    this.blurYFilter = new PIXI.BlurYFilter();

    this.passes =[this.blurXFilter, this.blurYFilter];
};

/**
 * Sets the strength of both the blurX and blurY properties simultaneously
 *
 * @property blur
 * @type Number the strength of the blur
 * @default 2
 */
Object.defineProperty(PIXI.BlurFilter.prototype, 'blur', {
    get: function() {
        return this.blurXFilter.blur;
    },
    set: function(value) {
        this.blurXFilter.blur = this.blurYFilter.blur = value;
    }
});

/**
 * Sets the strength of the blurX property
 *
 * @property blurX
 * @type Number the strength of the blurX
 * @default 2
 */
Object.defineProperty(PIXI.BlurFilter.prototype, 'blurX', {
    get: function() {
        return this.blurXFilter.blur;
    },
    set: function(value) {
        this.blurXFilter.blur = value;
    }
});

/**
 * Sets the strength of the blurX property
 *
 * @property blurY
 * @type Number the strength of the blurY
 * @default 2
 */
Object.defineProperty(PIXI.BlurFilter.prototype, 'blurY', {
    get: function() {
        return this.blurYFilter.blur;
    },
    set: function(value) {
        this.blurYFilter.blur = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This inverts your displayObjects colors.
 * @class InvertFilter
 * @contructor
 */
PIXI.InvertFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        invert: {type: '1f', value: 1},
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float invert;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord);',
        '   gl_FragColor.rgb = mix( (vec3(1)-gl_FragColor.rgb) * gl_FragColor.a, gl_FragColor.rgb, 1.0 - invert);',
        //'   gl_FragColor.rgb = gl_FragColor.rgb  * gl_FragColor.a;',
      //  '   gl_FragColor = gl_FragColor * vColor;',
        '}'
    ];
};

PIXI.InvertFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.InvertFilter.prototype.constructor = PIXI.InvertFilter;

/**
The strength of the invert. 1 will fully invert the colors, 0 will make the object its normal color
@property invert
*/
Object.defineProperty(PIXI.InvertFilter.prototype, 'invert', {
    get: function() {
        return this.uniforms.invert.value;
    },
    set: function(value) {
        this.uniforms.invert.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This applies a sepia effect to your displayObjects.
 * @class SepiaFilter
 * @contructor
 */
PIXI.SepiaFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        sepia: {type: '1f', value: 1},
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float sepia;',
        'uniform sampler2D uSampler;',

        'const mat3 sepiaMatrix = mat3(0.3588, 0.7044, 0.1368, 0.2990, 0.5870, 0.1140, 0.2392, 0.4696, 0.0912);',

        'void main(void) {',
        '   gl_FragColor = texture2D(uSampler, vTextureCoord);',
        '   gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb * sepiaMatrix, sepia);',
       // '   gl_FragColor = gl_FragColor * vColor;',
        '}'
    ];
};

PIXI.SepiaFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.SepiaFilter.prototype.constructor = PIXI.SepiaFilter;

/**
The strength of the sepia. 1 will apply the full sepia effect, 0 will make the object its normal color
@property sepia
*/
Object.defineProperty(PIXI.SepiaFilter.prototype, 'sepia', {
    get: function() {
        return this.uniforms.sepia.value;
    },
    set: function(value) {
        this.uniforms.sepia.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This filter applies a twist effect making display objects appear twisted in the given direction
 * @class TwistFilter
 * @contructor
 */
PIXI.TwistFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        radius: {type: '1f', value:0.5},
        angle: {type: '1f', value:5},
        offset: {type: '2f', value:{x:0.5, y:0.5}},
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform vec4 dimensions;',
        'uniform sampler2D uSampler;',

        'uniform float radius;',
        'uniform float angle;',
        'uniform vec2 offset;',

        'void main(void) {',
        '   vec2 coord = vTextureCoord - offset;',
        '   float distance = length(coord);',

        '   if (distance < radius) {',
        '       float ratio = (radius - distance) / radius;',
        '       float angleMod = ratio * ratio * angle;',
        '       float s = sin(angleMod);',
        '       float c = cos(angleMod);',
        '       coord = vec2(coord.x * c - coord.y * s, coord.x * s + coord.y * c);',
        '   }',

        '   gl_FragColor = texture2D(uSampler, coord+offset);',
        '}'
    ];
};

PIXI.TwistFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.TwistFilter.prototype.constructor = PIXI.TwistFilter;

/**
 *
 * This point describes the the offset of the twist
 * @property size
 * @type Point
 */
Object.defineProperty(PIXI.TwistFilter.prototype, 'offset', {
    get: function() {
        return this.uniforms.offset.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.offset.value = value;
    }
});

/**
 *
 * This radius describes size of the twist
 * @property size
 * @type Number
 */
Object.defineProperty(PIXI.TwistFilter.prototype, 'radius', {
    get: function() {
        return this.uniforms.radius.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.radius.value = value;
    }
});

/**
 *
 * This radius describes angle of the twist
 * @property angle
 * @type Number
 */
Object.defineProperty(PIXI.TwistFilter.prototype, 'angle', {
    get: function() {
        return this.uniforms.angle.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.angle.value = value;
    }
});
/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

/**
 *
 * This lowers the color depth of your image by the given amount, producing an image with a smaller palette.
 * @class ColorStepFilter
 * @contructor
 */
PIXI.ColorStepFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        step: {type: '1f', value: 5},
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform sampler2D uSampler;',
        'uniform float step;',

        'void main(void) {',
        '   vec4 color = texture2D(uSampler, vTextureCoord);',
        '   color = floor(color * step) / step;',
        '   gl_FragColor = color;',
        '}'
    ];
};

PIXI.ColorStepFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.ColorStepFilter.prototype.constructor = PIXI.ColorStepFilter;

/**
The number of steps.
@property step
*/
Object.defineProperty(PIXI.ColorStepFilter.prototype, 'step', {
    get: function() {
        return this.uniforms.step.value;
    },
    set: function(value) {
        this.uniforms.step.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 * original filter: https://github.com/evanw/glfx.js/blob/master/src/filters/fun/dotscreen.js
 */

/**
 *
 * This filter applies a dotscreen effect making display objects appear to be made out of black and white halftone dots like an old printer
 * @class DotScreenFilter
 * @contructor
 */
PIXI.DotScreenFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        scale: {type: '1f', value:1},
        angle: {type: '1f', value:5},
        dimensions:   {type: '4fv', value:[0,0,0,0]}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform vec4 dimensions;',
        'uniform sampler2D uSampler;',

        'uniform float angle;',
        'uniform float scale;',

        'float pattern() {',
        '   float s = sin(angle), c = cos(angle);',
        '   vec2 tex = vTextureCoord * dimensions.xy;',
        '   vec2 point = vec2(',
        '       c * tex.x - s * tex.y,',
        '       s * tex.x + c * tex.y',
        '   ) * scale;',
        '   return (sin(point.x) * sin(point.y)) * 4.0;',
        '}',

        'void main() {',
        '   vec4 color = texture2D(uSampler, vTextureCoord);',
        '   float average = (color.r + color.g + color.b) / 3.0;',
        '   gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);',
        '}'
    ];
};

PIXI.DotScreenFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.DotScreenFilter.prototype.constructor = PIXI.DotScreenFilter;

/**
 *
 * This describes the the scale
 * @property scale
 * @type Number
 */
Object.defineProperty(PIXI.DotScreenFilter.prototype, 'scale', {
    get: function() {
        return this.uniforms.scale.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.scale.value = value;
    }
});

/**
 *
 * This radius describes angle
 * @property angle
 * @type Number
 */
Object.defineProperty(PIXI.DotScreenFilter.prototype, 'angle', {
    get: function() {
        return this.uniforms.angle.value;
    },
    set: function(value) {
        this.dirty = true;
        this.uniforms.angle.value = value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.CrossHatchFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        blur: {type: '1f', value: 1 / 512},
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform float blur;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '    float lum = length(texture2D(uSampler, vTextureCoord.xy).rgb);',

        '    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);',

        '    if (lum < 1.00) {',
        '        if (mod(gl_FragCoord.x + gl_FragCoord.y, 10.0) == 0.0) {',
        '            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
        '        }',
        '    }',

        '    if (lum < 0.75) {',
        '        if (mod(gl_FragCoord.x - gl_FragCoord.y, 10.0) == 0.0) {',
        '            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
        '        }',
        '    }',

        '    if (lum < 0.50) {',
        '        if (mod(gl_FragCoord.x + gl_FragCoord.y - 5.0, 10.0) == 0.0) {',
        '            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
        '        }',
        '    }',

        '    if (lum < 0.3) {',
        '        if (mod(gl_FragCoord.x - gl_FragCoord.y - 5.0, 10.0) == 0.0) {',
        '            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
        '        }',
        '    }',
        '}'
    ];
};

PIXI.CrossHatchFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.CrossHatchFilter.prototype.constructor = PIXI.BlurYFilter;

Object.defineProperty(PIXI.CrossHatchFilter.prototype, 'blur', {
    get: function() {
        return this.uniforms.blur.value / (1/7000);
    },
    set: function(value) {
        //this.padding = value;
        this.uniforms.blur.value = (1/7000) * value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

PIXI.RGBSplitFilter = function()
{
    PIXI.AbstractFilter.call( this );

    this.passes = [this];

    // set the uniforms
    this.uniforms = {
        red: {type: '2f', value: {x:20, y:20}},
        green: {type: '2f', value: {x:-20, y:20}},
        blue: {type: '2f', value: {x:20, y:-20}},
        dimensions:   {type: '4fv', value:[0,0,0,0]}
    };

    this.fragmentSrc = [
        'precision mediump float;',
        'varying vec2 vTextureCoord;',
        'varying vec4 vColor;',
        'uniform vec2 red;',
        'uniform vec2 green;',
        'uniform vec2 blue;',
        'uniform vec4 dimensions;',
        'uniform sampler2D uSampler;',

        'void main(void) {',
        '   gl_FragColor.r = texture2D(uSampler, vTextureCoord + red/dimensions.xy).r;',
        '   gl_FragColor.g = texture2D(uSampler, vTextureCoord + green/dimensions.xy).g;',
        '   gl_FragColor.b = texture2D(uSampler, vTextureCoord + blue/dimensions.xy).b;',
        '   gl_FragColor.a = texture2D(uSampler, vTextureCoord).a;',
        '}'
    ];
};

PIXI.RGBSplitFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.RGBSplitFilter.prototype.constructor = PIXI.RGBSplitFilter;

Object.defineProperty(PIXI.RGBSplitFilter.prototype, 'angle', {
    get: function() {
        return this.uniforms.blur.value / (1/7000);
    },
    set: function(value) {
        //this.padding = value;
        this.uniforms.blur.value = (1/7000) * value;
    }
});

/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = PIXI;
        }
        exports.PIXI = PIXI;
    } else if (typeof define !== 'undefined' && define.amd) {
        define(PIXI);
    } else {
        root.PIXI = PIXI;
    }
}).call(this);
(function() {
  var KEY_CODE, Player, config, engine, mouse, player, updateWindowSize, wall, wallOptions;

  updateWindowSize = function() {
    window.w = window.innerWidth;
    return window.h = window.innerHeight;
  };

  Math.randomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  Player = (function() {
    function Player(x, y, radius, sides) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.sides = sides;
      this.body = Matter.Bodies.polygon(this.x, this.y, this.sides, this.radius, {
        restitution: 0.5
      });
      Matter.Composite.add(engine.world, this.body);
    }

    Player.prototype.move = function(x, y) {
      this.body.position.x += x;
      this.body.position.y += y;
      this.x = this.body.position.x;
      return this.y = this.body.position.y;
    };

    Player.prototype.enableControl = function() {
      return Matter.Events.on(engine, 'keyup', function(e) {
        switch (e.keyboard.sourceEvents.keyup.keyCode) {
          case KEY_CODE.ARROW.LEFT:
          case KEY_CODE.A:
            return player.move(-5, null);
          case KEY_CODE.ARROW.UP:
          case KEY_CODE.W:
            return player.move(null, -10);
          case KEY_CODE.ARROW.RIGHT:
          case KEY_CODE.D:
            return player.move(5, null);
          case KEY_CODE.ARROW.DOWN:
          case KEY_CODE.S:
            return player.move(null, 10);
        }
      });
    };

    return Player;

  })();

  updateWindowSize();

  window.onresize = function(event) {
    return updateWindowSize();
  };

  engine = Matter.Engine.create(document.body, {
    render: {
      options: {
        background: '#ffffff',
        wireframes: false
      }
    }
  });

  Matter.Engine.run(engine);

  player = new Player(window.w / 2, window.h / 2, 100, 10);

  player.enableControl();

  Matter.Events.on(engine, 'tick', function(e) {
    return engine.render.context.offset = new PIXI.Point(window.w / 2 - player.body.position.x, window.h / 2 - player.body.position.y);
  });

  config = {
    debug: true
  };

  KEY_CODE = {
    CTRL: 17,
    ALT: 18,
    ESC: 27,
    SPACE: 32,
    ENTER: 13,
    ARROW: {
      UP: 38,
      LEFT: 37,
      DOWN: 40,
      RIGHT: 39
    },
    W: 87,
    A: 65,
    S: 83,
    D: 68,
    E: 69,
    R: 82,
    Q: 81
  };

  mouse = Matter.MouseConstraint.create(engine, {
    constraint: {
      stiffness: 1
    }
  });

  Matter.Composite.add(engine.world, mouse);

  wallOptions = {
    isStatic: true,
    restitution: 0.5,
    render: {
      background: '#deb887',
      visible: true
    }
  };

  wall = {
    up: Matter.Bodies.rectangle(window.w / 2, 0, window.w, 10, wallOptions),
    down: Matter.Bodies.rectangle(window.w / 2, window.h - 5, window.w, 10, wallOptions),
    left: Matter.Bodies.rectangle(0, window.h / 2, 10, window.h, wallOptions),
    rigth: Matter.Bodies.rectangle(window.w - 5, window.h / 2, 10, window.h, wallOptions)
  };

  Matter.Composite.add(engine.world, [wall.up, wall.left, wall.down, wall.rigth]);

}).call(this);
