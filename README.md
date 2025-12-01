# Setup Helm

Install a specific version of helm binary on the runner.

## Example

Acceptable values are latest or any semantic version string like v3.5.0 Use this action in workflow to define which version of helm will be used. v2+ of this action only support Helm3.

```yaml
- uses: azure/setup-helm@v4.4.0
  with:
     version: '<version>' # default is latest (stable)
  id: install
```

> [!NOTE]
> If something goes wrong with fetching the latest version the action will use the hardcoded default version (currently v3.18.3). If you rely on a certain version higher than the default, you should explicitly use that version instead of latest.

The cached helm binary path is prepended to the PATH environment variable as well as stored in the helm-path output variable.
Refer to the action metadata file for details about all the inputs https://github.com/Azure/setup-helm/blob/master/action.yml

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Support

setup-helm is an open source project that is [**not** covered by the Microsoft Azure support policy](https://support.microsoft.com/en-us/help/2941892/support-for-linux-and-open-source-technology-in-azure). [Please search open issues here](https://github.com/Azure/setup-helm/issues), and if your issue isn't already represented please [open a new one](https://github.com/Azure/setup-helm/issues/new/choose). The project maintainers will respond to the best of their abilities.
