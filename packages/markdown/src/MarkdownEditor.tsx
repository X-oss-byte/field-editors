import * as React from 'react';

import { FieldExtensionSDK } from '@contentful/app-sdk';
import tokens from '@contentful/f36-tokens';
import { FieldConnector } from '@contentful/field-editor-shared';
import { css } from 'emotion';

import { MarkdownBottomBar, MarkdownHelp } from './components/MarkdownBottomBar';
import { MarkdownConstraints } from './components/MarkdownConstraints';
import MarkdownPreviewSkeleton from './components/MarkdownPreviewSkeleton';
import { MarkdownTabs } from './components/MarkdownTabs';
import {
  InitializedEditorType,
  MarkdownTextarea,
} from './components/MarkdownTextarea/MarkdownTextarea';
import { MarkdownToolbar } from './components/MarkdownToolbar';
import { openCheatsheetModal } from './dialogs/CheatsheetModalDialog';
import { createMarkdownActions } from './MarkdownActions';
import { MarkdownTab, PreviewComponents } from './types';

const MarkdownPreview = React.lazy(() => import('./components/MarkdownPreview'));

const styles = {
  container: css({
    display: 'flex',
    flexDirection: 'column',
    fontFamily: tokens.fontStackPrimary,
  }),
};

export interface MarkdownEditorProps {
  /**
   * is the field disabled initially
   */
  isInitiallyDisabled: boolean;
  /**
   * Minimum height to set for the markdown text area and preview
   */
  minHeight?: string | number;

  sdk: FieldExtensionSDK;

  previewComponents?: PreviewComponents;
  onReady?: Function;
}

export function MarkdownEditor(
  props: MarkdownEditorProps & {
    disabled: boolean;
    initialValue: string | null | undefined;
    saveValueToSDK: Function;
  }
) {
  const [currentValue, setCurrentValue] = React.useState<string>(props.initialValue ?? '');
  const [selectedTab, setSelectedTab] = React.useState<MarkdownTab>('editor');
  const [editor, setEditor] = React.useState<InitializedEditorType | null>(null);
  const [canUploadAssets, setCanUploadAssets] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (editor && props.onReady) {
      props.onReady(editor);
      // fix: http://codemirror.977696.n3.nabble.com/codemirror-content-not-visible-in-bootstrap-modal-td4026988.html
      setTimeout(() => {
        editor.refresh();
      }, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: Evaluate the dependencies
  }, [editor]);

  React.useEffect(() => {
    props.sdk.access.can('create', 'Asset').then((value) => {
      setCanUploadAssets(value);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: Evaluate the dependencies
  }, []);

  React.useEffect(() => {
    if (editor) {
      editor.setReadOnly(props.disabled);
    }
  }, [editor, props.disabled]);

  const isActionDisabled = editor === null || props.disabled || selectedTab !== 'editor';

  const direction = props.sdk.locales.direction[props.sdk.field.locale] ?? 'ltr';

  const actions = React.useMemo(() => {
    return createMarkdownActions({ sdk: props.sdk, editor, locale: props.sdk.field.locale });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: Evaluate the dependencies
  }, [editor]);

  const openMarkdownHelp = React.useCallback(() => {
    openCheatsheetModal(props.sdk.dialogs);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: Evaluate the dependencies
  }, []);

  return (
    <div className={styles.container} data-test-id="markdown-editor">
      <MarkdownTabs
        active={selectedTab}
        onSelect={(tab) => {
          setSelectedTab(tab);
        }}
      />
      <MarkdownToolbar
        mode="default"
        disabled={isActionDisabled}
        canUploadAssets={canUploadAssets}
        actions={actions}
      />
      <MarkdownTextarea
        minHeight={props.minHeight}
        mode="default"
        visible={selectedTab === 'editor'}
        disabled={isActionDisabled}
        direction={direction}
        onReady={(editor) => {
          editor.setContent(props.initialValue ?? '');
          editor.setReadOnly(props.disabled);
          setEditor(editor);
          editor.events.onChange((value: string) => {
            // Trim empty lines
            const trimmedValue = value.replace(/^\s+$/gm, '');
            props.saveValueToSDK(trimmedValue);
            setCurrentValue(value);
          });
        }}
      />
      {selectedTab === 'preview' && (
        <React.Suspense fallback={<MarkdownPreviewSkeleton />}>
          <MarkdownPreview
            direction={direction}
            minHeight={props.minHeight}
            mode="default"
            value={currentValue}
            previewComponents={props.previewComponents}
          />
        </React.Suspense>
      )}
      <MarkdownBottomBar>
        <MarkdownHelp onClick={openMarkdownHelp} />
      </MarkdownBottomBar>
      <MarkdownConstraints sdk={props.sdk} value={currentValue} />
    </div>
  );
}

export function MarkdownEditorConnected(props: MarkdownEditorProps) {
  return (
    <FieldConnector<string>
      throttle={300}
      field={props.sdk.field}
      isInitiallyDisabled={props.isInitiallyDisabled}
    >
      {({ value, disabled, setValue, externalReset }) => {
        // on external change reset component completely and init with initial value again
        return (
          <MarkdownEditor
            {...props}
            key={`markdown-editor-${externalReset}`}
            initialValue={value}
            disabled={disabled}
            saveValueToSDK={setValue}
          />
        );
      }}
    </FieldConnector>
  );
}
