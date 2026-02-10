# Toolchain & Build Strategy

## Philosophy
"Works on my machine" is not acceptable. We use Containerization for reproducibility.

## The Workbench
1.  **Kernel Build:** Uses `build-essential` and `linux-headers` matching the target kernel.
2.  **User Build:** Uses `node-gyp` for C++ native addons.

## Future Roadmap
* Dockerize the cross-compilation environment.
* Implement CI/CD pipeline to run Mock Driver tests automatically.