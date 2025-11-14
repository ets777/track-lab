import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModelFormGroup } from 'src/app/types/model-form-group';
import { IonItem, IonLabel, IonInput, IonCheckbox } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { ValidationErrorDirective } from "src/app/directives/validation-error";
import { CommonModule } from '@angular/common';
import { existingEntityValidator } from 'src/app/validators-async/existing-entity.validator';
import { ITag } from 'src/app/db/models/tag';
import { tagValidator } from 'src/app/validators/tag.validator';
import { TagService } from 'src/app/services/tag.service';

export type TagForm = {
    name: string;
    isHidden: boolean;
};

@Component({
    selector: 'app-tag-form',
    templateUrl: './tag-form.component.html',
    styleUrls: ['./tag-form.component.scss'],
    imports: [IonCheckbox, IonLabel, IonItem, IonInput, FormsModule, ReactiveFormsModule, TranslateModule, ValidationErrorDirective, CommonModule, ValidationErrorDirective],
})
export class TagFormComponent implements OnInit {
    @Input() tag?: ITag;

    public tagForm!: ModelFormGroup<TagForm>;

    constructor(
        private formBuilder: FormBuilder,
        private tagService: TagService,
    ) { }

    ngOnInit() {
        this.tagForm = this.formBuilder.group({
            name: ['', {
                asyncValidators: [
                    existingEntityValidator(this.tagService, this.tag?.name)
                ],
                validators: [
                    Validators.required,
                    tagValidator,
                ],
            }],
            isHidden: [false],
        });

        if (this.tag) {
            this.setTagData(this.tag);
        } else {
            this.setDefaultData();
        }
    }

    setDefaultData() {
        this.tagForm.patchValue({
            name: '',
            isHidden: false,
        });
    }

    setTagData(tag: ITag) {
        this.tagForm.patchValue({
            name: tag.name,
            isHidden: tag.isHidden,
        });
    }
}
