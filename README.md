# Embedded Hybrid Architecture Scaffold

> **A reference implementation for decoupling Real-time OT constraints from IT-based Linux environments.**

## 1. What is this?
This repository is an **operational baseline (Scaffold)** designed to bootstrap embedded system projects.
It focuses on solving one specific problem: **How to interface high-level runtimes (Node.js) with low-level kernel drivers without creating "Spaghetti Code".**

## 2. Directory Structure
* `kernel/`: The Linux Kernel Module (The Muscle). Handles hardware timing.
* `user/`: The Node.js Adapter (The Brain). Handles business logic.
* `decisions/`: Architecture Decision Records (ADRs).
* `toolchain/`: Setup guides for reproducible builds.

## 3. Core Principles
* **Atomic Responsibility:** Kernel handles Mechanism; User handles Policy.
* **Explicit Boundaries:** Communication defined via `ioctl` contract.
* **Fault Isolation:** User-space crashes do not affect Kernel-space safety loops.