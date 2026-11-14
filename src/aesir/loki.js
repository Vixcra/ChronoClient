// ============================================================================
// CHRONO CLIENT - AESIR MODULE: LOKI (Server-TPS Clock & Smoother Engine 🦊)
// ============================================================================
// Decouples render FPS (VSync / Unlocked FPS) from network simulation rate:
// 1. Measures live WebSocket packet cadence to track true server TPS & jitter.
// 2. Scales Evades' render smoother (`wg`) velocity step against the live
//    server tick interval instead of a fixed nominal clock, preventing overshoot
//    and rubberband snaps during server lag while keeping rAF fully unlocked.
// 3. Toggleable live ON/OFF at runtime via `window.Chrono.Loki.setEnabled()`.
(function() {
    try {
        window.Chrono = window.Chrono || {};

        const STORAGE_KEY = "chrono_loki_enabled";
        const saved = localStorage.getItem(STORAGE_KEY);
        const state = {
            enabled: saved === null ? true : (saved === "1")
        };

        // Live WebSocket server TPS clock (ring buffer of binary packet arrival timestamps)
        const RING_SIZE = 16;
        const packetRing = new Float64Array(RING_SIZE);
        let ringHead = 0;
        let ringCount = 0;
        let lastPacketMs = 0;
        let activeSocket = null;

        let liveTickMs = 33.3333; // Default 30 TPS fallback until packets are measured
        let jitterMs = 0;
        let totalPackets = 0;
        let wgHooked = false;

        function resetClock(ws) {
            activeSocket = ws || null;
            ringHead = 0;
            ringCount = 0;
            lastPacketMs = 0;
            jitterMs = 0;
        }

        function recordWsPacket(ws, now) {
            if (ws && ws !== activeSocket) {
                resetClock(ws);
            }
            totalPackets++;

            if (lastPacketMs > 0) {
                const dt = now - lastPacketMs;
                // Ignore connect bursts, area load stalls, or background unfocus gaps
                if (dt > 250) {
                    ringHead = 0;
                    ringCount = 0;
                    lastPacketMs = now;
                    return;
                }

                packetRing[ringHead] = now;
                ringHead = (ringHead + 1) % RING_SIZE;
                if (ringCount < RING_SIZE) ringCount++;

                // Sliding span over last N packets is immune to burst packet jitter
                if (ringCount >= 4) {
                    const oldestIdx = ringCount < RING_SIZE ? 0 : ringHead;
                    const span = now - packetRing[oldestIdx];
                    const intervals = ringCount - 1;
                    if (intervals > 0 && span > 0) {
                        const measured = Math.max(12.0, Math.min(120.0, span / intervals));
                        liveTickMs += 0.25 * (measured - liveTickMs);
                    }
                }

                jitterMs += 0.125 * (Math.abs(dt - liveTickMs) - jitterMs);
            } else {
                packetRing[0] = now;
                ringHead = 1;
                ringCount = 1;
            }

            lastPacketMs = now;
        }

        function isBinaryFrame(data) {
            return Boolean(
                data &&
                (data instanceof ArrayBuffer ||
                 ArrayBuffer.isView(data) ||
                 (typeof Blob !== "undefined" && data instanceof Blob && data.size > 4))
            );
        }

        // Hook WebSocket incoming messages passively to measure live server TPS
        try {
            if (typeof window !== "undefined" && typeof window.WebSocket !== "undefined") {
                const listenerMap = new WeakMap();
                const origAdd = WebSocket.prototype.addEventListener;
                const origRemove = WebSocket.prototype.removeEventListener;

                WebSocket.prototype.addEventListener = function(type, listener, options) {
                    if (type === "message" && typeof listener === "function") {
                        let wrapped = listenerMap.get(listener);
                        if (!wrapped) {
                            wrapped = function(ev) {
                                if (ev && isBinaryFrame(ev.data)) {
                                    recordWsPacket(this, performance.now());
                                }
                                return listener.apply(this, arguments);
                            };
                            listenerMap.set(listener, wrapped);
                        }
                        return origAdd.call(this, type, wrapped, options);
                    }
                    return origAdd.call(this, type, listener, options);
                };

                WebSocket.prototype.removeEventListener = function(type, listener, options) {
                    if (type === "message" && typeof listener === "function") {
                        const wrapped = listenerMap.get(listener);
                        if (wrapped) {
                            return origRemove.call(this, type, wrapped, options);
                        }
                    }
                    return origRemove.call(this, type, listener, options);
                };

                const desc = Object.getOwnPropertyDescriptor(WebSocket.prototype, "onmessage");
                if (desc && desc.set && desc.get) {
                    const onMsgMap = new WeakMap();
                    Object.defineProperty(WebSocket.prototype, "onmessage", {
                        configurable: true,
                        enumerable: true,
                        get() {
                            return onMsgMap.get(this) || desc.get.call(this);
                        },
                        set(listener) {
                            if (typeof listener === "function") {
                                onMsgMap.set(this, listener);
                                const wrapped = function(ev) {
                                    if (ev && isBinaryFrame(ev.data)) {
                                        recordWsPacket(this, performance.now());
                                    }
                                    return listener.apply(this, arguments);
                                };
                                desc.set.call(this, wrapped);
                            } else {
                                onMsgMap.delete(this);
                                desc.set.call(this, listener);
                            }
                        }
                    });
                }
            }
        } catch(e) {}

        // Hook Evades smoother class (`wg`) once instantiated
        function hookWgPrototype(proto) {
            if (!proto || proto._chrono_loki_hooked || typeof proto.apply !== "function") return;
            proto._chrono_loki_hooked = true;
            wgHooked = true;

            const origApply = proto.apply;
            const origReset = typeof proto.reset === "function" ? proto.reset : function() {
                this.dispX = void 0;
                this.dispY = void 0;
                this.lastVx = 0;
                this.lastVy = 0;
            };

            proto.reset = function() {
                this._lokiLastTargetX = void 0;
                this._lokiLastTargetY = void 0;
                if (!state.enabled) {
                    return origReset.apply(this, arguments);
                }
                // Always snap on explicit engine reset (teleporters, area/map transitions, death)
                this.dispX = void 0;
                this.dispY = void 0;
                this.lastVx = 0;
                this.lastVy = 0;
            };

            proto.apply = function(targetX, targetY, vx, vy, frameDtMs, minSpeed, decel) {
                if (!state.enabled) {
                    this._lokiLastTargetX = void 0;
                    this._lokiLastTargetY = void 0;
                    return origApply.apply(this, arguments);
                }

                if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
                    return { x: targetX, y: targetY };
                }

                const vX = Number.isFinite(vx) ? vx : 0;
                const vY = Number.isFinite(vy) ? vy : 0;

                // Exclude zero-smoothing entities (e.g. teleporting_enemy, star_enemy use hardSnapFactor: 0)
                if (typeof this.hardSnapFactor === "number" && this.hardSnapFactor <= 0) {
                    this.dispX = targetX;
                    this.dispY = targetY;
                    this.lastVx = vX;
                    this.lastVy = vY;
                    this._lokiLastTargetX = targetX;
                    this._lokiLastTargetY = targetY;
                    return { x: targetX, y: targetY };
                }

                const frameDt = (Number.isFinite(frameDtMs) && frameDtMs > 0) ? Math.min(frameDtMs, 100) : 16.6667;

                // First frame or post-reset snap (teleporters, area warps, spawns)
                if (this.dispX === void 0 || this.dispY === void 0) {
                    this.dispX = targetX;
                    this.dispY = targetY;
                    this.lastVx = vX;
                    this.lastVy = vY;
                    this._lokiLastTargetX = targetX;
                    this._lokiLastTargetY = targetY;
                    return { x: targetX, y: targetY };
                }

                // Scale velocity step by the real measured server tick period (TPS-locked)
                // while rendering every rAF frame (VSync / unlocked FPS).
                const tickMs = liveTickMs;
                const tickFrac = frameDt / tickMs;
                const predX = this.dispX + vX * tickFrac;
                const predY = this.dispY + vY * tickFrac;

                const targetJump = (Number.isFinite(this._lokiLastTargetX) && Number.isFinite(this._lokiLastTargetY))
                    ? Math.hypot(targetX - this._lokiLastTargetX, targetY - this._lokiLastTargetY)
                    : 0;
                this._lokiLastTargetX = targetX;
                this._lokiLastTargetY = targetY;

                const dx = targetX - predX;
                const dy = targetY - predY;
                const dist = Math.hypot(dx, dy);

                const velMag = Math.hypot(vX, vY);
                const minSpd = Number.isFinite(minSpeed) ? minSpeed : 0;
                const speedScale = Math.max(velMag, minSpd, 1);

                // Local player (`Sg`, jitterWiden === true): snap immediately on teleporter/ability jumps
                // (TELEPORT_ZONE, Obscure, Shift, Wormhole, etc. often skip Sg.reset() via Yb()).
                // Enemies keep their own hardSnapFactor and stationary-warp snap (e.g. dripping ceiling respawn).
                const isLocalPlayerSmoother = Boolean(this.jitterWiden);
                let hardSnapDist;
                if (isLocalPlayerSmoother) {
                    hardSnapDist = Math.max(speedScale * 4, 36);
                    const maxNormalTargetJump = Math.max(velMag * Math.max(1.2, tickFrac) + Math.max(minSpd * 2.0, 18), 28);
                    if (targetJump > maxNormalTargetJump) {
                        hardSnapDist = 0;
                    }
                } else {
                    const entityFactor = Number.isFinite(this.hardSnapFactor) ? this.hardSnapFactor : 3;
                    hardSnapDist = Math.max(speedScale * entityFactor, 24);
                    if (velMag < 0.05 && dist > Math.max(minSpd * 2.2, 18)) {
                        hardSnapDist = 0;
                    }
                }

                if (dist > hardSnapDist || dist <= 0.1) {
                    this.dispX = targetX;
                    this.dispY = targetY;
                    this.lastVx = vX;
                    this.lastVy = vY;
                    return { x: targetX, y: targetY };
                }

                // Smooth exponential convergence calibrated to the live server tick interval
                const tauMs = Math.max(55, tickMs * 2.2);
                const baseAlpha = 1 - Math.exp(-frameDt / tauMs);
                const softSpan = Math.max(speedScale * 1.5, 18);
                const ramp = Math.max(0, Math.min(1, (dist - softSpan) / Math.max(hardSnapDist - softSpan, 1)));
                const k = Math.min(1, baseAlpha + ramp * 0.45 * (1 - baseAlpha));

                this.dispX = predX + dx * k;
                this.dispY = predY + dy * k;
                this.lastVx = vX;
                this.lastVy = vY;

                return { x: this.dispX, y: this.dispY };
            };
        }

        // One-shot trap on `wg` constructor (`this.lastVx = 0`), removed immediately after hooking
        try {
            Object.defineProperty(Object.prototype, "lastVx", {
                configurable: true,
                enumerable: false,
                get() {
                    return this._loki_lastVx;
                },
                set(v) {
                    Object.defineProperty(this, "lastVx", {
                        value: v,
                        writable: true,
                        configurable: true,
                        enumerable: true
                    });
                    if (!wgHooked && typeof this.apply === "function" && typeof this.reset === "function") {
                        hookWgPrototype(Object.getPrototypeOf(this));
                        try { delete Object.prototype.lastVx; } catch(e) {}
                    }
                }
            });
        } catch(e) {}

        function notifySettingsUI() {
            if (typeof window.Chrono?.updateLokiSettingsUI === "function") {
                try { window.Chrono.updateLokiSettingsUI(); } catch(e) {}
            }
        }

        window.Chrono.Loki = {
            state: state,
            isEnabled: function() {
                return state.enabled;
            },
            setEnabled: function(val) {
                state.enabled = Boolean(val);
                localStorage.setItem(STORAGE_KEY, state.enabled ? "1" : "0");
                notifySettingsUI();
            },
            getStats: function() {
                const tickMs = liveTickMs;
                const tps = tickMs > 0 ? (1000 / tickMs) : 0;
                return {
                    enabled: state.enabled,
                    tps: Math.round(tps * 10) / 10,
                    tickMs: Math.round(tickMs * 10) / 10,
                    jitterMs: Math.round(jitterMs * 10) / 10,
                    packets: totalPackets,
                    hooked: wgHooked
                };
            }
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", notifySettingsUI);
        } else {
            notifySettingsUI();
        }
    } catch(e) {
        console.error("[Chrono Loki] Init error:", e);
    }
})();

