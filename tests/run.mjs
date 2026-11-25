import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
const windowsPython=join(process.env.LOCALAPPDATA||'', 'Programs','Python','Python312','python.exe');
const python=process.env.PYTHON||(existsSync(windowsPython)?windowsPython:'python3');
const result=spawnSync(python,['tests/test_contract.py'],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
