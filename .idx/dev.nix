
{ pkgs, ... }: {

  # Use the stable Nixpkgs channel.
  channel = "stable-23.11";

  # Use https://search.nixos.org/packages to find packages.
  packages = [
    pkgs.nodejs_20
  ];

  # Enable and configure web previews.
  idx.previews = {
    enable = true;
    previews = {
      web = {
        # The label that will appear in the web preview panel.
        label = "Web App";
        # The URL to open in the preview.
        # This is the URL of your deployed Cloud Run service.
        url = "https://users-164502969077.asia-southeast1.run.app";
      };
    };
  };

  # You can add more configuration here, like environment variables or VS Code extensions.
}
