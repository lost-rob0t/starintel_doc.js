{
  description = "A set of Node-RED nodes to work with documents in a Cloudant database that is integrated with IBM Cloud or an on-premises CouchDB. This version is a superset of the functionality in the original Cloudant node and replicates the functionality of the node-red-contrib-cloudantplus node and will eventually replace it.";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs";
  };

  outputs = { self, nixpkgs }:
    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
    in
    {
      devShell.x86_64-linux =
        pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
          ];
          shellHook = ''
            export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath([pkgs.openssl])}
          '';
        };
    };
}
