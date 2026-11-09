# Setup Helm

Install a specific version of helm binary on the runner.

## Example

Acceptable values are `latest` or any semantic version string such as `v4.3.1`. The `latest` value follows Helm's current stable release and can change major versions.

```yaml
- uses: azure/setup-helm@v5
  with:
     version: '<version>' # default is latest (stable)
  id: install
```

Alternatively, the version can be read from a [`.tool-versions`](https://asdf-vm.com/manage/configuration.html) file (the format used by [asdf](https://asdf-vm.com/) and [mise](https://mise.jdx.dev/)) via the `version-file` input:

```yaml
- uses: azure/setup-helm@v5.0.0
  with:
     version-file: .tool-versions
  id: install
```

The action reads the version declared for the `helm` tool, for example:

```
helm 4.3.1
```

If both `version` and `version-file` are set, an explicitly requested `version` takes precedence and `version-file` is ignored (a warning is emitted). Because `version` defaults to `latest`, `version-file` is only ignored when you set `version` to a specific value other than `latest`; if `version` is left at its default, the version from `version-file` is used.

> [!NOTE]
> If fetching the latest version fails, the action retries a few times and then uses the built-in fallback version (currently v4.3.1). This is a last-known stable version and can become a major version behind what `latest` resolves to. To fail the step with the underlying error instead, set `latest-fallback` to `'false'`:
>
> ```yaml
> - uses: azure/setup-helm@v5
>   with:
>      version: 'latest'
>      latest-fallback: 'false'
> ```
>
> If you rely on a certain version, you should explicitly request that version instead of `latest`.

Freshly downloaded Helm archives from the default `get.helm.sh` endpoint are verified against the SHA-256 checksum published beside the archive before extraction. With the default `checksum-policy: auto`, custom mirrors are also verified when they provide a matching checksum as a bare 64-character hexadecimal digest at `<archive-url>.sha256`; when the checksum is not found, the action warns and continues downloading from the custom mirror. Existing tool-cache entries continue to be reused without downloading or re-verifying the archive.

Set `checksum-policy` to control this behavior:

- `auto` (default): require checksums from `get.helm.sh`; verify custom mirror checksums when available and warn when they are absent.
- `required`: require a valid matching checksum from every download location.
- `if-available`: verify checksums when available and warn when they are absent.
- `disabled`: skip checksum verification and emit a warning.

Malformed or mismatched checksums always fail unless verification is explicitly `disabled`. In `if-available` and `auto` modes, only a checksum response of HTTP 404 or 410 is treated as absent; other download errors fail closed.

Because each checksum is retrieved from the same mirror as its archive, verification detects corruption or an incomplete mirror sync; it does not protect against a mirror that has been compromised together with its checksum files.

An optional fallback mirror can be used when version resolution, archive download, or checksum verification fails against the primary location:

```yaml
- uses: azure/setup-helm@v5
  with:
     version: 'v4.3.1'
     downloadBaseURL: 'https://primary.example/helm'
     downloadBaseURLFallback: 'https://fallback.example/helm'
```

The fallback archive follows the same checksum policy as the primary mirror. This capability follows the use case proposed by @mvtavares in [#227](https://github.com/Azure/setup-helm/pull/227).

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
