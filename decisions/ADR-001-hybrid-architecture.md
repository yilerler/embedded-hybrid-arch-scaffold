# ADR-001: Hybrid Architecture for Safety-Critical Edge Systems

* **Status:** Accepted
* **Context:** Industrial Safety Monitoring System

## Context
We need **sub-50ms reaction time** for safety stops, but also **cloud connectivity**.
Pure Linux (User Space) introduces unpredictable jitter due to OS scheduling and Garbage Collection.

## Decision
We adopt a **Heterogeneous Architecture**:
1.  **Kernel Space:** Responsible for "Hard Real-time" tasks (Ring Buffers, Interrupts).
2.  **User Space:** Responsible for "Soft Real-time" tasks (MQTT, JSON).

## Consequences
* **Positive:** Fault Isolation. If Node.js crashes, the Kernel module keeps running safety logic.
* **Negative:** Requires maintaining C and JS codebases with a strict interface contract.