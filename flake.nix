{
  description = "StarIntel v0.9.0 document specification for JavaScript";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      forAllSystems = nixpkgs.lib.genAttrs systems;

      mkPackage = pkgs:
        pkgs.stdenvNoCC.mkDerivation {
          pname = "starintel-doc-js";
          version = "0.9.0";
          src = self;

          nativeBuildInputs = [ pkgs.nodejs ];
          dontConfigure = true;

          buildPhase = ''
            runHook preBuild

            mkdir -p dist
            npm pack --ignore-scripts --pack-destination dist

            runHook postBuild
          '';

          doCheck = true;
          checkPhase = ''
            runHook preCheck

            for dir in src bin; do
              if [ -d "$dir" ]; then
                find "$dir" -type f -name '*.js' -print0 \
                  | xargs -0 -r -n1 node --check
              fi
            done

            runHook postCheck
          '';

          installPhase = ''
            runHook preInstall

            archive="$(find dist -maxdepth 1 -type f -name '*.tgz' -print -quit)"
            test -n "$archive"

            mkdir -p \
              "$out/share/npm" \
              "$out/lib/node_modules/starintel_doc"

            cp "$archive" "$out/share/npm/starintel_doc-0.9.0.tgz"

            for path in src bin package.json package-lock.json README.md LICENSE; do
              if [ -e "$path" ]; then
                cp -R "$path" "$out/lib/node_modules/starintel_doc/"
              fi
            done

            runHook postInstall
          '';

          passthru = {
            npmPackage = "share/npm/starintel_doc-0.9.0.tgz";
            nodeModule = "lib/node_modules/starintel_doc";
          };

          meta = {
            description = "StarIntel v0.9.0 document parser, validator, and serializer for JavaScript";
            homepage = "https://github.com/lost-rob0t/starintel_doc.js";
          };
        };
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          package = mkPackage pkgs;
        in
        {
          default = package;
          starintel-doc-js = package;
        });

      checks = forAllSystems (system: {
        default = self.packages.${system}.starintel-doc-js;
      });

      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs
              pkgs.nodePackages.prettier
            ];
          };
        });

      overlays.default = final: _prev: {
        starintel-doc-js = mkPackage final;
      };
    };
}
