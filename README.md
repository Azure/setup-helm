# Setup Helm
Install a specific version of helm binary on the runner.
## Example

Acceptable values are latest or any semantic version string like v3.5.0 Use this action in workflow to define which version of helm will be used. v2 and v3 of this action only supports Helm3.

```yaml
- uses: azure/setup-helm@v3
  with:
    version: '<version>' # default is latest stable
  id: install
```

The cached helm binary path is prepended to the PATH environment variable as well as stored in the helm-path output variable.
Refer to the action metadata file for details about all the inputs https://github.com/Azure/setup-helm/blob/master/action.yml

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
