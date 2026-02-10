# Embedded Hybrid Architecture Scaffold

> **A reference implementation for decoupling Real-time OT constraints from IT-based Linux environments.**

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Platform](https://img.shields.io/badge/platform-Linux%20Kernel%20%7C%20Node.js-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 1. What is this?
This repository is an **operational baseline (Scaffold)** designed to bootstrap embedded system projects that require high reliability.
It distills the architectural patterns from a complex heterogeneous integration project into a reusable, clean-slate template.

It focuses on solving one specific problem: **How to interface high-level runtimes (Node.js) with low-level kernel drivers without creating "Spaghetti Code".**

## 2. What this is NOT
* ❌ **Not a Product Demo:** It contains no business logic (e.g., no specific safety algorithms).
* ❌ **Not a Tutorial:** It assumes familiarity with Linux Kernel primitives and asynchronous programming.
* ❌ **Not a Framework:** It is a minimal, dependency-free structural guide.

## 3. Why this exists (The Problem)
In typical IoT edge development, engineers often mix *business logic* with *hardware control*. This leads to:
1.  **Race Conditions:** When multiple user-space processes access hardware simultaneously.
2.  **Latency Jitter:** When Garbage Collection (GC) in high-level languages blocks critical IO.
3.  **Testing Nightmares:** Inability to test firmware logic without physical hardware.

## 4. Core Principles (The Solution)
This scaffold enforces the following engineering disciplines:
* **Atomic Responsibility:** Kernel space handles *Mechanism* (Timing, Data Integrity); User space handles *Policy* (Business Logic, Cloud Sync).
* **Explicit Boundaries:** All communications are strictly defined via a C-header contract (`ioctl`).
* **Design for Testability:** Includes a "Mock Driver" mechanism to allow CI/CD verification without hardware-in-the-loop.

## 5. Directory Structure
* `scaffold/kernel`: The Linux Kernel Module (The Muscle).
* `scaffold/user`: The Node.js Adapter (The Brain).
* `decisions/`: Architecture Decision Records (ADRs) explaining *why* we chose this path.
* `toolchain/`: Setup scripts for a reproducible build environment (Workbench).

---
*Maintained by [Your Name]. Engineered for stability.*
